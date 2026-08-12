import { expect, test } from "bun:test";
import type { IcebreakerStateDto } from "../../fastQuestions/schemas/icebreaker.contract.schema";
import { sharedChallengeSessionSchema } from "../schemas/sharedChallenge.schema";
import { mapSharedChallengeState } from "./sharedChallenge.mapper";

const EVENT_ID = "8f14e45f-ea0c-4d6b-9f1c-2b3a4c5d6e7f";
const VIEWER = "11111111-1111-4111-8111-111111111111";

function dto(overrides: Partial<IcebreakerStateDto> = {}): IcebreakerStateDto {
  return {
    session_id: "44444444-4444-4444-8444-444444444444",
    status: "running",
    language: "en",
    phase: 2,
    round: 3,
    total_rounds: 3,
    question: null,
    rounds: [
      { code: "Q001", text: "One", participant_duration_seconds: 30 },
      { code: "Q031", text: "Two", participant_duration_seconds: 45 },
      { code: "Q066", text: "Three", participant_duration_seconds: 60 },
    ],
    challenge: "What would you change about how people find work?",
    current_participant: null,
    participant_order: [{ attendee_id: VIEWER, name: "Ana" }],
    viewer: { attendee_id: VIEWER, name: "Ana" },
    turn_index: 0,
    participant_duration_seconds: null,
    turn_starts_at: null,
    turn_ends_at: "2026-08-09T20:22:00.000Z",
    closing_line: null,
    ...overrides,
  };
}

test("produces a session the shared-challenge schema accepts", () => {
  expect(() => sharedChallengeSessionSchema.parse(mapSharedChallengeState(EVENT_ID, dto())))
    .not.toThrow();
});

test("renames running to active and carries the group deadline", () => {
  const session = mapSharedChallengeState(EVENT_ID, dto());
  expect(session.phaseId).toBe("phase_2");
  expect(session.status).toBe("active");
  expect(session.challenge).toBe("What would you change about how people find work?");
  expect(session.timerEndsAt).toBe("2026-08-09T20:22:00.000Z");
  // No individual turn to protect, so the backend leaves the start null and
  // the ring runs from the moment the screen appears.
  expect(session.timerStartedAt).toBeNull();
});

test("renames finished to complete and keeps the closing line", () => {
  const session = mapSharedChallengeState(
    EVENT_ID,
    dto({
      status: "finished",
      turn_ends_at: null,
      closing_line: "Time! Before you split — swap contacts with anyone you want to see again.",
    }),
  );
  expect(session.status).toBe("complete");
  expect(session.timerEndsAt).toBeNull();
  expect(session.closingLine).toContain("swap contacts");
  expect(() => sharedChallengeSessionSchema.parse(session)).not.toThrow();
});

test("drops a stale deadline the backend left behind on a finished session", () => {
  // The schema rejects a complete session that still carries a deadline, so
  // the mapper nulls it rather than trusting the wire.
  const session = mapSharedChallengeState(EVENT_ID, dto({ status: "finished" }));
  expect(session.timerEndsAt).toBeNull();
  expect(() => sharedChallengeSessionSchema.parse(session)).not.toThrow();
});

test("turns a missing challenge into an empty string the screen can guard", () => {
  const session = mapSharedChallengeState(EVENT_ID, dto({ challenge: null }));
  expect(session.challenge).toBe("");
  expect(() => sharedChallengeSessionSchema.parse(session)).not.toThrow();
});

test("narrows a regional language tag the same way the backend does", () => {
  expect(mapSharedChallengeState(EVENT_ID, dto({ language: "es-MX" })).language).toBe("es");
  expect(mapSharedChallengeState(EVENT_ID, dto({ language: "en-US" })).language).toBe("en");
  // Anything the UI has no strings for falls back to English, matching the
  // backend's own CLOSING_LINE lookup.
  expect(mapSharedChallengeState(EVENT_ID, dto({ language: "pt" })).language).toBe("en");
});
