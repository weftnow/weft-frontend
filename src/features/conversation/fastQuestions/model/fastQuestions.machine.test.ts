import { expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import { advanceParticipantAt, advanceSessionAt, startSessionAt } from "./fastQuestions.machine";

const EVENT_ID = "9de77386-a57f-42d6-9581-cf4a75328a87";
const T0 = Date.parse("2026-08-08T20:00:00.000Z");
// Mirrors READING_MILLISECONDS in fastQuestions.machine.ts: a session start
// and each round transition (but not an in-round handover) now carries this
// gap, so the deadlines below shift by it.
const READING_MS = 8_000;

function threeParticipants() {
  const session = createMockFastQuestionsSession(EVENT_ID, { NODE_ENV: "production" });
  return fastQuestionsSessionSchema.parse({
    ...session,
    participants: session.participants.slice(0, 3).map((participant, index) => ({
      ...participant,
      isCurrentUser: index === 2,
    })),
  });
}

test("starts at participant zero with the first duration", () => {
  const started = startSessionAt(threeParticipants(), T0);
  expect(started.status).toBe("active");
  expect(started.participantIndex).toBe(0);
  // First participant's window is the reading gap plus the round's duration.
  expect(started.timerEndsAt).toBe("2026-08-08T20:00:38.000Z");
});

test("chains from deadlines and restarts each round at participant zero", () => {
  // Round 0 (3 x 30s) plus the session-start gap.
  const roundTwo = advanceSessionAt(
    startSessionAt(threeParticipants(), T0),
    T0 + 90_000 + READING_MS,
  );
  expect([roundTwo.roundIndex, roundTwo.participantIndex]).toEqual([1, 0]);
  // Adds the round-two gap on top of the session-start gap already elapsed.
  expect(roundTwo.timerEndsAt).toBe("2026-08-08T20:02:31.000Z");
});

test("catches up after backgrounding and stops before Phase 2", () => {
  // All nine turns (30+45+60 seconds x 3 participants) plus the three gaps:
  // session start and the two round transitions.
  const complete = advanceSessionAt(
    startSessionAt(threeParticipants(), T0),
    T0 + 405_000 + READING_MS * 3,
  );
  expect(complete.status).toBe("phase_complete");
  expect(complete.timerEndsAt).toBeNull();
});

test("ignores stale advances and rebases a valid early advance", () => {
  const started = startSessionAt(threeParticipants(), T0);
  expect(advanceParticipantAt(started, { roundIndex: 0, participantIndex: 1 }, T0 + 5_000))
    .toEqual(started);
  const valid = advanceParticipantAt(
    started,
    { roundIndex: 0, participantIndex: 0 },
    T0 + 5_000,
  );
  expect(valid.participantIndex).toBe(1);
  expect(valid.timerEndsAt).toBe("2026-08-08T20:00:35.000Z");
});

test("a new round's first participant gets the reading gap", () => {
  const session = threeParticipants();
  const started = startSessionAt(session, T0);
  expect(Date.parse(started.timerStartedAt!) - T0).toBe(READING_MS);

  // Walk to the last participant of round 1, then one more step.
  let current = started;
  for (let i = 0; i < session.participants.length; i += 1) {
    current = advanceParticipantAt(
      current,
      { roundIndex: current.roundIndex, participantIndex: current.participantIndex },
      Date.parse(current.timerEndsAt!),
    );
  }
  expect(current.roundIndex).toBe(1);
  const handover = Date.parse(current.timerStartedAt!);
  const previousEnd = Date.parse(started.timerEndsAt!);
  expect(handover).toBeGreaterThan(previousEnd);
});
