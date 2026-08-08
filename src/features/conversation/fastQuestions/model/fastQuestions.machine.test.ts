import { expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import { advanceParticipantAt, advanceSessionAt, startSessionAt } from "./fastQuestions.machine";

const EVENT_ID = "9de77386-a57f-42d6-9581-cf4a75328a87";
const T0 = Date.parse("2026-08-08T20:00:00.000Z");

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
  expect(started.timerEndsAt).toBe("2026-08-08T20:00:30.000Z");
});

test("chains from deadlines and restarts each round at participant zero", () => {
  const roundTwo = advanceSessionAt(startSessionAt(threeParticipants(), T0), T0 + 90_000);
  expect([roundTwo.roundIndex, roundTwo.participantIndex]).toEqual([1, 0]);
  expect(roundTwo.timerEndsAt).toBe("2026-08-08T20:02:15.000Z");
});

test("catches up after backgrounding and stops before Phase 2", () => {
  const complete = advanceSessionAt(startSessionAt(threeParticipants(), T0), T0 + 405_000);
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
