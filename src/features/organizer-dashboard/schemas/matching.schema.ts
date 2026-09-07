/**
 * The matching contract, as this application is allowed to receive it.
 *
 * OpenSpec `improve-matching-reliability`, task 1.2.
 *
 * Every schema here is a hand-written mirror of a Pydantic model in
 * `weft-b2b-backend/app/schemas/matching.py`. Written twice on purpose — the
 * two repositories deploy separately and neither can import the other — and
 * held together by `contracts/*.json`, a set of payloads that lives
 * byte-identically in both repositories and must get the same verdict from
 * both. `matching.schema.test.ts` replays them; the backend's
 * `tests/test_matching_contract.py` replays the same file.
 *
 * The group schemas live here rather than in `dashboard.schema.ts`, even
 * though the room map is a dashboard payload, because task 6.2 makes the room
 * and the run one decision: whether to render "No tables yet" depends on
 * whether a run succeeded, so the two contracts are read together and drift
 * together.
 *
 * What this file buys: today `dashboard.gateway.ts` trusts `unknown` payloads
 * for groups, lock and reveal, so a 200 with a malformed body renders as an
 * empty room. Once these schemas are in the transport (task 4.2), that becomes
 * an invalid-contract failure instead.
 */

import { z } from "zod";

/**
 * The four lifecycle states, and no `retrying`.
 *
 * A retry is the *same* run recording another attempt, so it comes back as
 * `queued` with `attempt` incremented rather than as a state of its own. A
 * fifth variant here would let the dashboard render "retrying" while the row
 * it came from says something else.
 */
export const matchingRunStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export type MatchingRunStatus = z.infer<typeof matchingRunStatusSchema>;

/** Still working. The attendee waiting screen (task 6.5) turns on this set. */
export const ACTIVE_STATUSES: ReadonlySet<MatchingRunStatus> = new Set([
  "queued",
  "running",
]);

/** Nothing further will move. */
export const TERMINAL_STATUSES: ReadonlySet<MatchingRunStatus> = new Set([
  "succeeded",
  "failed",
]);

/** The nine codes from the design, mirroring `MatchingFailureCode`. */
export const matchingFailureCodeSchema = z.enum([
  "no_eligible_attendees",
  "invalid_matching_input",
  "partition_unsatisfied",
  "dependency_timeout",
  "dependency_unavailable",
  "persistence_failed",
  "queue_submission_failed",
  "stalled",
  "internal_failure",
]);

export type MatchingFailureCode = z.infer<typeof matchingFailureCodeSchema>;

/**
 * Codes for which running the same run again could plausibly work.
 *
 * The split is by what fixes the failure, not by how alarming it sounds. The
 * three absent codes all mean the inputs must change first — reopen the event,
 * fix a submission, spread the guest list — so offering a retry would be
 * offering to fail again identically, which is the "generic unchanged retry"
 * the spec forbids. `internal_failure` is here despite being the least
 * understood: publication is atomic, so a retry cannot double up a room.
 *
 * Duplicated from the backend's `RETRYABLE_FAILURE_CODES` so the dashboard can
 * reason about a failure without a round trip. The payload carries `retryable`
 * too, and the schema below refuses any payload where the two disagree.
 */
export const RETRYABLE_FAILURE_CODES: ReadonlySet<MatchingFailureCode> = new Set([
  "dependency_timeout",
  "dependency_unavailable",
  "persistence_failed",
  "queue_submission_failed",
  "stalled",
  "internal_failure",
]);

export function isRetryable(code: MatchingFailureCode): boolean {
  return RETRYABLE_FAILURE_CODES.has(code);
}

/**
 * A diagnostic reference is an opaque handle, not prose.
 *
 * Letters, digits and hyphens only. This is the type-level half of "no public
 * payload carries the raw exception": no exception message survives the
 * pattern, so a backend regression that put `str(exc)` back on the wire — the
 * thing this whole change exists to undo — arrives here as an invalid contract
 * rather than as text rendered to an organizer.
 */
export const REFERENCE_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

const MESSAGE_MAX_LENGTH = 300;

/**
 * Every timestamp on the wire carries an offset, because the columns behind
 * them are all `DateTime(timezone=True)`. Kept as a string rather than coerced
 * to a Date: the dashboard formats in the event's timezone, not the browser's.
 */
const isoTimestamp = z.iso.datetime({ offset: true });

export const matchingFailureSchema = z
  .object({
    code: matchingFailureCodeSchema,
    retryable: z.boolean(),
    /**
     * The backend's safe fallback sentence. The dashboard keys its own
     * translations off `code` rather than rendering this, so that failure copy
     * can be Spanish for a Spanish organizer.
     */
    message: z.string().min(1).max(MESSAGE_MAX_LENGTH),
    reference: z.string().regex(REFERENCE_PATTERN),
  })
  .superRefine((value, ctx) => {
    const expected = isRetryable(value.code);
    if (value.retryable !== expected) {
      ctx.addIssue({
        code: "custom",
        path: ["retryable"],
        message: `${value.code} is retryable=${expected}, not ${value.retryable}`,
      });
    }
  });

export type MatchingFailure = z.infer<typeof matchingFailureSchema>;

/**
 * One matching run.
 *
 * The nullable fields are nullable because a run that never started has
 * nothing to count and nothing to version. The refinement below is what stops
 * that becoming vagueness: each status carries exactly the fields it can
 * honestly have, so this application never has to guess which fields to trust
 * for a given state. All six rules mirror
 * `MatchingRunOut._fields_match_status`.
 */
export const matchingRunSchema = z
  .object({
    run_id: z.uuid(),
    event_id: z.uuid(),
    status: matchingRunStatusSchema,
    /** Worker claims, not lock presses. A queued run nobody picked up is 0. */
    attempt: z.number().int().min(0),

    created_at: isoTimestamp,
    started_at: isoTimestamp.nullable().default(null),
    /** The heartbeat, not a progress fraction — there is no such thing here. */
    progress_at: isoTimestamp.nullable().default(null),
    finished_at: isoTimestamp.nullable().default(null),

    attendee_count: z.number().int().min(0).nullable().default(null),
    group_count: z.number().int().min(0).nullable().default(null),

    params_version: z.string().max(32).nullable().default(null),
    encoder_version: z.string().max(32).nullable().default(null),
    algorithm_version: z.string().max(32).nullable().default(null),

    failure: matchingFailureSchema.nullable().default(null),
  })
  .superRefine((value, ctx) => {
    const fail = (message: string, path: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    // 1. A failure object is exactly what makes a run failed.
    const failed = value.status === "failed";
    if (failed && value.failure === null) {
      fail("a failed run must carry its failure", "failure");
    }
    if (!failed && value.failure !== null) {
      fail(`a ${value.status} run cannot carry a failure`, "failure");
    }

    // 2. A claim is what sets `started_at`, and `attempt` counts claims, so
    //    the two move together in both directions. This is the rule that makes
    //    a retry representable: the same run goes back to `queued` carrying
    //    attempt 1 and the first attempt's start time. A blanket "a queued run
    //    has not started" would forbid that.
    if ((value.attempt === 0) !== (value.started_at === null)) {
      fail("started_at is set exactly when attempt is above zero", "started_at");
    }

    // 3. A heartbeat before the run was ever claimed is nobody's.
    if (value.progress_at !== null && value.started_at === null) {
      fail("progress_at belongs to an attempt that started", "progress_at");
    }

    // 4. Terminal is precisely "has a finish time", and is deliberately not
    //    tied to `started_at`: a run that dies at queue submission is failed at
    //    attempt 0, so it finished without ever starting.
    const terminal = TERMINAL_STATUSES.has(value.status);
    if (terminal && value.finished_at === null) {
      fail(`a ${value.status} run has finished`, "finished_at");
    }
    if (!terminal && value.finished_at !== null) {
      fail(`a ${value.status} run has not finished`, "finished_at");
    }

    // 5. Running and succeeded both mean a worker did the work.
    if (
      (value.status === "running" || value.status === "succeeded")
      && value.attempt === 0
    ) {
      fail(`a ${value.status} run has been claimed`, "attempt");
    }

    // 6. Success is the only state that knows what it produced, and it always
    //    knows. The counts are what the organizer sees instead of the room's
    //    contents; the versions are what tells two runs apart later.
    if (value.status === "succeeded") {
      if (value.attendee_count === null || value.group_count === null) {
        fail("a succeeded run knows how many people it seated", "group_count");
      }
      if (
        value.params_version === null
        || value.encoder_version === null
        || value.algorithm_version === null
      ) {
        fail("a succeeded run records how it was computed", "params_version");
      }
    }
  });

export type MatchingRun = z.infer<typeof matchingRunSchema>;

/**
 * What `POST /v1/events/{id}/lock` answers.
 *
 * `status` is the compatibility field. The rollout deploys the backend before
 * this application, so for one deploy the key a live dashboard already reads
 * has to keep arriving; `run` is the addition. The whole run rides along
 * rather than a bare id, because a repeated lock returns the *existing* run
 * and this side can only tell what to render if that run's status comes with
 * it.
 */
export const lockAcceptedSchema = z.object({
  status: z.literal("locked"),
  run: matchingRunSchema,
});

export type LockAccepted = z.infer<typeof lockAcceptedSchema>;

/**
 * What `POST /v1/events/{id}/reveal` answers. Unchanged, and modelled anyway:
 * reveal is the other irreversible action, and giving it a schema is what lets
 * an unparseable reply be treated as an invalid contract rather than a success.
 */
export const revealAcceptedSchema = z.object({
  status: z.literal("revealing"),
});

export const groupMemberSchema = z.object({
  /** Null for a free organizer: the paywall is enforced server-side, so a free
   *  browser is never sent a name it is merely trusted not to render. */
  display_name: z.string().nullable(),
  confirmed: z.boolean(),
});

export const groupSchema = z.object({
  index: z.number().int().min(0),
  colour: z.string().min(1),
  members: z.array(groupMemberSchema),
});

/**
 * The room map. A list, so an empty room is a successful answer rather than an
 * error — and, once task 6.2 lands, the *only* thing allowed to render "No
 * tables yet". A failed request is not an empty room.
 */
export const groupListSchema = z.array(groupSchema);

export type Group = z.infer<typeof groupSchema>;
export type GroupMember = z.infer<typeof groupMemberSchema>;

/**
 * The envelope every backend `DomainError` leaves as.
 *
 * `code` stays a plain string rather than an enum. The domain codes it carries
 * (`event_over`, `plan_required`, and the per-raise ones) are a longer-lived
 * and more open vocabulary than `MatchingFailureCode`, and narrowing it here
 * would mean a new backend error code breaks an already-deployed browser —
 * exactly the compatibility direction the rollout plan is built to avoid.
 */
export const publicErrorSchema = z.object({
  detail: z.string(),
  code: z.string(),
});

export type PublicError = z.infer<typeof publicErrorSchema>;
