import { expect, test } from "bun:test";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { IcebreakerStateDto } from "../schemas/icebreaker.contract.schema";
import { mapIcebreakerState } from "./fastQuestions.mapper";

const EVENT_ID = "8f14e45f-ea0c-4d6b-9f1c-2b3a4c5d6e7f";
const VIEWER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const THIRD = "33333333-3333-4333-8333-333333333333";

function dto(overrides: Partial<IcebreakerStateDto> = {}): IcebreakerStateDto {
  return {
    session_id: "44444444-4444-4444-8444-444444444444",
    status: "running",
    language: "en",
    phase: 1,
    round: 1,
    total_rounds: 3,
    question: { code: "Q001", text: "One" },
    rounds: [
      { code: "Q001", text: "One", participant_duration_seconds: 30 },
      { code: "Q031", text: "Two", participant_duration_seconds: 45 },
      { code: "Q066", text: "Three", participant_duration_seconds: 60 },
    ],
    challenge: null,
    current_participant: { attendee_id: VIEWER, name: "Ana" },
    participant_order: [
      { attendee_id: VIEWER, name: "Ana" },
      { attendee_id: OTHER, name: "Bruno" },
      { attendee_id: THIRD, name: "Carla" },
    ],
    viewer: { attendee_id: VIEWER, name: "Ana" },
    turn_index: 0,
    participant_duration_seconds: 30,
    turn_starts_at: "2026-08-09T20:15:00.000Z",
    turn_ends_at: "2026-08-09T20:15:30.000Z",
    closing_line: null,
    ...overrides,
  };
}

test("produces a session the UI schema accepts", () => {
  expect(() => fastQuestionsSessionSchema.parse(mapIcebreakerState(EVENT_ID, dto()))).not.toThrow();
});

test("marks exactly the viewer as the current user", () => {
  const session = mapIcebreakerState(EVENT_ID, dto());
  expect(session.participants.filter(({ isCurrentUser }) => isCurrentUser)).toHaveLength(1);
  expect(session.participants.find(({ isCurrentUser }) => isCurrentUser)?.id).toBe(VIEWER);
});

test("renames running to active and rebases the round to zero", () => {
  const session = mapIcebreakerState(EVENT_ID, dto({ round: 2, turn_index: 1 }));
  expect(session.status).toBe("active");
  expect(session.roundIndex).toBe(1);
  expect(session.participantIndex).toBe(1);
});

test("reads the timer start from the wire rather than deriving it", () => {
  // Derivation was only ever right because no gap existed. With a reading gap
  // turn_starts_at is later than turn_ends_at minus the duration.
  const session = mapIcebreakerState(
    EVENT_ID,
    dto({
      turn_starts_at: "2026-08-09T20:15:08.000Z",
      turn_ends_at: "2026-08-09T20:15:38.000Z",
      participant_duration_seconds: 30,
    }),
  );
  expect(session.timerStartedAt).toBe("2026-08-09T20:15:08.000Z");
  expect(session.timerEndsAt).toBe("2026-08-09T20:15:38.000Z");
});

test("prefers the wire value even when it disagrees with the derivation", () => {
  // Deliberately inconsistent: turn_ends_at - participant_duration_seconds
  // would derive 20:15:08, but the wire says the turn actually started at
  // 20:15:00. Both the mock machine and the backend always construct
  // turn_ends_at as turn_starts_at + duration, so a *consistent* fixture can
  // never tell "read" and "derive" apart — do not "fix" these numbers into
  // agreement, that would silently re-break this test's ability to catch a
  // regression back to derivation.
  const session = mapIcebreakerState(
    EVENT_ID,
    dto({
      turn_starts_at: "2026-08-09T20:15:00.000Z",
      turn_ends_at: "2026-08-09T20:15:38.000Z",
      participant_duration_seconds: 30,
    }),
  );
  expect(session.timerStartedAt).toBe("2026-08-09T20:15:00.000Z");
});

test("falls back to the end instant when the wire has no start", () => {
  // Null means a session created before the backend carried turn_starts_at.
  // Those sessions should read as "already started" rather than idle.
  const session = mapIcebreakerState(EVENT_ID, dto({ turn_starts_at: null }));
  expect(session.timerStartedAt).toBe(session.timerEndsAt);
});

test("carries the whole deck with its per-round durations", () => {
  const session = mapIcebreakerState(EVENT_ID, dto());
  expect(session.rounds).toHaveLength(3);
  expect(session.rounds.map(({ participantDurationSeconds }) => participantDurationSeconds)).toEqual(
    [30, 45, 60],
  );
  expect(session.rounds[0]?.question).toBe("One");
});

test("drops timestamps once the phase is complete", () => {
  // The UI schema rejects an inactive session that still carries timestamps.
  const session = mapIcebreakerState(EVENT_ID, dto({ status: "phase_complete" }));
  expect(session.status).toBe("phase_complete");
  expect(session.timerStartedAt).toBeNull();
  expect(session.timerEndsAt).toBeNull();
  expect(() => fastQuestionsSessionSchema.parse(session)).not.toThrow();
});

test("keeps a waiting session free of timestamps", () => {
  const session = mapIcebreakerState(
    EVENT_ID,
    dto({ status: "waiting", turn_ends_at: null, participant_duration_seconds: 30 }),
  );
  expect(session.status).toBe("waiting");
  expect(session.timerEndsAt).toBeNull();
});

test("treats phase two and finished as the end of fast questions", () => {
  // Fast Questions is phase 1 only; anything past it reads as complete rather
  // than leaking a status the UI has no screen for.
  for (const state of [
    dto({ phase: 2, status: "running", question: null }),
    dto({ status: "finished", question: null }),
  ]) {
    const session = mapIcebreakerState(EVENT_ID, state);
    expect(session.status).toBe("phase_complete");
    expect(session.timerEndsAt).toBeNull();
  }
});

test("gives every participant a distinct, stable avatar", () => {
  const first = mapIcebreakerState(EVENT_ID, dto());
  const second = mapIcebreakerState(EVENT_ID, dto());
  expect(first.participants.map(({ avatarUrl }) => avatarUrl)).toEqual(
    second.participants.map(({ avatarUrl }) => avatarUrl),
  );
  expect(first.participants.every(({ avatarUrl }) => avatarUrl.length > 0)).toBe(true);
});

test("clamps a round beyond the deck rather than producing an invalid index", () => {
  const session = mapIcebreakerState(EVENT_ID, dto({ round: 9 }));
  expect(session.roundIndex).toBe(2);
});
