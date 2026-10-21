import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import {
  ACTIVE_STATUSES,
  groupListSchema,
  isRetryable,
  lockAcceptedSchema,
  matchingFailureCodeSchema,
  matchingFailureSchema,
  matchingRunSchema,
  matchingRunStatusSchema,
  publicErrorSchema,
  revealAcceptedSchema,
  RETRYABLE_FAILURE_CODES,
  TERMINAL_STATUSES,
  type MatchingFailureCode,
} from "./matching.schema";

/**
 * OpenSpec `improve-matching-reliability`, tasks 1.2 and 1.3.
 *
 * Two jobs. The first half pins these schemas directly — every lifecycle
 * state, every failure code, each cross-field rule on its own so a broken rule
 * names itself. The second half replays `contracts/*.json`, which lives
 * byte-identically in `weft-b2b-backend` and is replayed there by
 * `tests/test_matching_contract.py`. Those two halves are the only thing
 * stopping two hand-written schemas from drifting apart.
 */

const CREATED = "2026-09-07T18:04:11Z";
const STARTED = "2026-09-07T18:04:13Z";
const FINISHED = "2026-09-07T18:05:41Z";

const RUN_ID = "6f1d9c3a-4b2e-4f7a-9c81-2d5e8a0b7f43";
const EVENT_ID = "b7e2c419-8a3d-4e51-9f06-1c4a7d92e358";

function failure(code: MatchingFailureCode = "internal_failure") {
  return {
    code,
    retryable: isRetryable(code),
    message: "Something went wrong on our side.",
    reference: "Z6F2S4JT",
  };
}

function run(overrides: Record<string, unknown> = {}) {
  return {
    run_id: RUN_ID,
    event_id: EVENT_ID,
    status: "queued",
    attempt: 0,
    created_at: CREATED,
    started_at: null,
    progress_at: null,
    finished_at: null,
    attendee_count: null,
    group_count: null,
    params_version: null,
    encoder_version: null,
    algorithm_version: null,
    failure: null,
    ...overrides,
  };
}

function succeeded(overrides: Record<string, unknown> = {}) {
  return run({
    status: "succeeded",
    attempt: 1,
    started_at: STARTED,
    finished_at: FINISHED,
    attendee_count: 48,
    group_count: 10,
    params_version: "v1.1",
    encoder_version: "v1",
    algorithm_version: "v1",
    ...overrides,
  });
}

/** Assert the payload is refused, and hand back the joined complaint. */
function rejects(schema: ZodType, payload: unknown): string {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(false);
  return result.success ? "" : result.error.issues.map((i) => i.message).join(" | ");
}

describe("the lifecycle states", () => {
  test("there are exactly four, and they split into active and terminal", () => {
    // A fifth state, or one in neither set, silently breaks the attendee
    // waiting screen and the single-active-run rule — both of which ask "is
    // this still going?" by set membership.
    expect(matchingRunStatusSchema.options).toEqual([
      "queued",
      "running",
      "succeeded",
      "failed",
    ]);
    const all = new Set([...ACTIVE_STATUSES, ...TERMINAL_STATUSES]);
    expect([...all].sort()).toEqual([...matchingRunStatusSchema.options].sort());
    for (const status of ACTIVE_STATUSES) {
      expect(TERMINAL_STATUSES.has(status)).toBe(false);
    }
  });

  test("a queued run carries nothing but the fact that it is waiting", () => {
    const parsed = matchingRunSchema.parse(run());
    expect(parsed.status).toBe("queued");
    expect(parsed.attempt).toBe(0);
    expect(parsed.started_at).toBeNull();
    expect(parsed.failure).toBeNull();
  });

  test("a running run has been claimed", () => {
    const parsed = matchingRunSchema.parse(
      run({ status: "running", attempt: 1, started_at: STARTED, progress_at: STARTED }),
    );
    expect(parsed.started_at).toBe(STARTED);
  });

  test("a retry is the same run queued again, and keeps its history", () => {
    // The rule this pins is why `queued` does not simply forbid `started_at`:
    // a retry re-queues the same run, so it is queued with attempt 1 and the
    // first attempt's start time still on it.
    const parsed = matchingRunSchema.parse(
      run({ status: "queued", attempt: 1, started_at: STARTED }),
    );
    expect(parsed.status).toBe("queued");
    expect(parsed.attempt).toBe(1);
  });

  test("a succeeded run says what it produced and how", () => {
    const parsed = matchingRunSchema.parse(succeeded());
    expect(parsed.group_count).toBe(10);
    expect(parsed.params_version).toBe("v1.1");
  });

  test("a failed run carries its failure", () => {
    const parsed = matchingRunSchema.parse(
      run({
        status: "failed",
        attempt: 1,
        started_at: STARTED,
        finished_at: FINISHED,
        failure: failure("partition_unsatisfied"),
      }),
    );
    expect(parsed.failure?.code).toBe("partition_unsatisfied");
    expect(parsed.failure?.retryable).toBe(false);
  });

  test("a run that dies at queue submission finished without ever starting", () => {
    // The one shape that looks contradictory and is not. Any rule tying
    // finished_at to started_at would forbid this failure's only outcome.
    const parsed = matchingRunSchema.parse(
      run({
        status: "failed",
        attempt: 0,
        finished_at: CREATED,
        failure: failure("queue_submission_failed"),
      }),
    );
    expect(parsed.started_at).toBeNull();
    expect(parsed.finished_at).toBe(CREATED);
  });

  test("the optional fields default to null when the backend omits them", () => {
    // The rollout adds backend fields first, so this side has to survive a
    // payload written by a version that predates one of them.
    const parsed = matchingRunSchema.parse({
      run_id: RUN_ID,
      event_id: EVENT_ID,
      status: "queued",
      attempt: 0,
      created_at: CREATED,
    });
    expect(parsed.finished_at).toBeNull();
    expect(parsed.failure).toBeNull();
  });
});

describe("the invariants", () => {
  test("a failed run without a failure is refused", () => {
    expect(
      rejects(
        matchingRunSchema,
        run({ status: "failed", attempt: 1, started_at: STARTED, finished_at: FINISHED }),
      ),
    ).toContain("must carry its failure");
  });

  for (const status of ["queued", "running", "succeeded"] as const) {
    test(`only a failed run may carry a failure (${status})`, () => {
      const base = status === "succeeded"
        ? succeeded()
        : run({
          status,
          attempt: status === "running" ? 1 : 0,
          started_at: status === "running" ? STARTED : null,
        });
      expect(rejects(matchingRunSchema, { ...base, failure: failure() }))
        .toContain("cannot carry a failure");
    });
  }

  test("started_at and attempt move together in both directions", () => {
    expect(rejects(matchingRunSchema, run({ started_at: STARTED })))
      .toContain("started_at is set exactly when attempt");
    expect(rejects(matchingRunSchema, run({ status: "running", attempt: 1 })))
      .toContain("started_at is set exactly when attempt");
  });

  test("a heartbeat needs an attempt to belong to", () => {
    expect(rejects(matchingRunSchema, run({ progress_at: STARTED })))
      .toContain("progress_at belongs to an attempt");
  });

  for (const status of ["queued", "running"] as const) {
    test(`an unfinished run has no finish time (${status})`, () => {
      expect(
        rejects(
          matchingRunSchema,
          run({
            status,
            attempt: status === "running" ? 1 : 0,
            started_at: status === "running" ? STARTED : null,
            finished_at: FINISHED,
          }),
        ),
      ).toContain("has not finished");
    });
  }

  test("a terminal run has a finish time", () => {
    expect(rejects(matchingRunSchema, succeeded({ finished_at: null })))
      .toContain("has finished");
  });

  for (const status of ["running", "succeeded"] as const) {
    test(`work cannot have happened at attempt zero (${status})`, () => {
      // attempt 0 with no start time is internally consistent — it is what
      // every queued run looks like — so this reaches the rule that says
      // running and succeeded both mean a worker actually claimed the run.
      const base = status === "succeeded" ? succeeded() : run({ status });
      expect(
        rejects(matchingRunSchema, { ...base, attempt: 0, started_at: null }),
      ).toContain("has been claimed");
    });
  }

  for (const missing of ["attendee_count", "group_count"] as const) {
    test(`a succeeded run knows how many people it seated (${missing})`, () => {
      expect(rejects(matchingRunSchema, succeeded({ [missing]: null })))
        .toContain("how many people it seated");
    });
  }

  for (const missing of ["params_version", "encoder_version", "algorithm_version"] as const) {
    test(`a succeeded run records how it was computed (${missing})`, () => {
      expect(rejects(matchingRunSchema, succeeded({ [missing]: null })))
        .toContain("how it was computed");
    });
  }

  test("an attempt count is never negative", () => {
    rejects(matchingRunSchema, run({ attempt: -1 }));
  });

  test("a timestamp without an offset is refused", () => {
    // A naive datetime is a different moment depending on who reads it.
    rejects(matchingRunSchema, run({ created_at: "2026-09-07T18:04:11" }));
  });

  test("a run id that is not a UUID is refused", () => {
    rejects(matchingRunSchema, run({ run_id: "run-42" }));
  });
});

describe("the failure codes", () => {
  test("every code is classified as retryable or not", () => {
    for (const code of matchingFailureCodeSchema.options) {
      expect(typeof isRetryable(code)).toBe("boolean");
    }
    for (const code of RETRYABLE_FAILURE_CODES) {
      expect(matchingFailureCodeSchema.options).toContain(code);
    }
  });

  test("the three non-retryable codes are the ones needing different input", () => {
    // Retryability splits by what fixes the failure, not by how alarming it
    // sounds. These three all mean the inputs must change first.
    const nonRetryable = matchingFailureCodeSchema.options.filter((c) => !isRetryable(c));
    expect(nonRetryable.sort()).toEqual([
      "invalid_matching_input",
      "no_eligible_attendees",
      "partition_unsatisfied",
    ]);
  });

  for (const code of matchingFailureCodeSchema.options) {
    test(`${code} round trips with its own retryability`, () => {
      const parsed = matchingFailureSchema.parse(failure(code));
      expect(parsed.retryable).toBe(isRetryable(code));
    });

    test(`${code} cannot disagree with the table`, () => {
      expect(
        rejects(matchingFailureSchema, { ...failure(code), retryable: !isRetryable(code) }),
      ).toContain("is retryable=");
    });
  }

  test("an unknown code is refused rather than passed through", () => {
    rejects(matchingFailureSchema, { ...failure(), code: "everything_exploded" });
  });

  test("a reference cannot carry a raw exception", () => {
    // The pattern is the type-level half of "no public payload carries the raw
    // exception". `Event.partition_error` is what happens without it.
    for (const smuggled of [
      "ValueError: cannot partition 3 people into groups of 5",
      "Traceback (most recent call last)",
      "run 6f1d9c3a failed",
      "",
    ]) {
      rejects(matchingFailureSchema, { ...failure(), reference: smuggled });
    }
  });

  test("a reference is long enough to quote and short enough to read", () => {
    matchingFailureSchema.parse({ ...failure(), reference: "A".repeat(8) });
    matchingFailureSchema.parse({ ...failure(), reference: "A".repeat(64) });
    rejects(matchingFailureSchema, { ...failure(), reference: "A".repeat(7) });
    rejects(matchingFailureSchema, { ...failure(), reference: "A".repeat(65) });
  });

  test("a failure always says something to the person reading it", () => {
    rejects(matchingFailureSchema, { ...failure(), message: "" });
    rejects(matchingFailureSchema, { ...failure(), message: "x".repeat(301) });
  });
});

describe("the action and error envelopes", () => {
  test("lock keeps the status key a deployed browser already reads", () => {
    // The rollout deploys the backend first, so for one deploy this key is the
    // only thing the live dashboard understands.
    const parsed = lockAcceptedSchema.parse({ status: "locked", run: run() });
    expect(parsed.status).toBe("locked");
    expect(parsed.run.status).toBe("queued");
  });

  test("lock refuses the response the backend returns today", () => {
    rejects(lockAcceptedSchema, { status: "locked" });
  });

  test("reveal is modelled so an unparseable reply is not read as success", () => {
    expect(revealAcceptedSchema.parse({ status: "revealing" }).status).toBe("revealing");
    rejects(revealAcceptedSchema, { status: "locked" });
  });

  test("the error envelope accepts a code this contract has never seen", () => {
    // Narrowing `code` to an enum would mean a new backend error breaks an
    // already-deployed browser, which is the direction the rollout avoids.
    expect(
      publicErrorSchema.parse({ detail: "already running", code: "matching_run_active" }).code,
    ).toBe("matching_run_active");
    rejects(publicErrorSchema, { detail: "no code here" });
  });

  test("an empty room parses, and a failed request is not one", () => {
    expect(groupListSchema.parse([])).toEqual([]);
    rejects(groupListSchema, { index: 0, colour: "amber", members: [] });
  });
});

describe("the shared contract fixtures", () => {
  // Resolved from this file rather than the working directory, so the suite
  // finds the fixtures however it was invoked. `import.meta.url` over
  // `import.meta.dir` because only the former is in the standard lib types.
  const CONTRACTS = fileURLToPath(new URL("../../../../contracts/", import.meta.url));

  const SCHEMAS: Record<string, ZodType> = {
    status: matchingRunSchema,
    lock: lockAcceptedSchema,
    groups: groupListSchema,
    failure: matchingFailureSchema,
    public_error: publicErrorSchema,
  };

  type Fixture = {
    contract: string;
    valid: { why: string; payload: unknown }[];
    invalid: { why: string; payload: unknown }[];
  };

  const load = (name: string): Fixture =>
    JSON.parse(readFileSync(join(CONTRACTS, `${name}.json`), "utf8"));

  test("every fixture file is present and names its contract", () => {
    // A file renamed on one side and not the other would otherwise show up as
    // nothing at all: the loops below would simply generate fewer cases and
    // still pass.
    for (const name of Object.keys(SCHEMAS)) {
      const fixture = load(name);
      expect(fixture.contract).toBe(name);
      expect(fixture.valid.length).toBeGreaterThan(0);
      expect(fixture.invalid.length).toBeGreaterThan(0);
    }
  });

  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const fixture = load(name);
    for (const { why, payload } of fixture.valid) {
      test(`${name} accepts — ${why}`, () => {
        const result = schema.safeParse(payload);
        if (!result.success) {
          throw new Error(
            `${why}\n${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")}`,
          );
        }
      });
    }
    for (const { why, payload } of fixture.invalid) {
      test(`${name} refuses — ${why}`, () => {
        expect(schema.safeParse(payload).success).toBe(false);
      });
    }
  }
});
