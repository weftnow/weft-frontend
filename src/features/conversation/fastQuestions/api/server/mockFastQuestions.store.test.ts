import { expect, test } from "bun:test";
import { READING_MILLISECONDS } from "../../model/fastQuestions.machine";
import { SHARED_CHALLENGE_SECONDS } from "../../../sharedChallenge/model/sharedChallenge.timing";
import { createMockFastQuestionsStore } from "./mockFastQuestions.store";

test("keeps one canonical event session and makes start idempotent", async () => {
  const store = createMockFastQuestionsStore();
  const eventId = "15336e92-b153-40bc-a3d8-d55643a116af";
  expect((await store.get(eventId, 1_000)).status).toBe("waiting");
  const first = await store.start(eventId, 1_000);
  const duplicate = await store.start(eventId, 2_000);
  expect(first.timerEndsAt).toBe(duplicate.timerEndsAt);
});

test("returns canonical state for stale and valid advances", async () => {
  const store = createMockFastQuestionsStore();
  const eventId = "056dc3d4-b47f-4812-bdb1-f568391cd8bb";
  const started = await store.start(eventId, 1_000);
  // Past the first participant's reading gap, so this exercises the
  // stale/valid distinction rather than the separate reading-gap guard.
  const pastGap = 1_000 + READING_MILLISECONDS + 1_000;
  const stale = await store.advance(eventId, { roundIndex: 0, participantIndex: 1 }, pastGap);
  const valid = await store.advance(eventId, { roundIndex: 0, participantIndex: 0 }, pastGap);
  expect(stale).toEqual(started);
  if (valid.phaseId !== "phase_1") throw new Error("expected a phase one session");
  expect(valid.participantIndex).toBe(1);
});

test("continue is idempotent and plays through to a finished session", async () => {
  const store = createMockFastQuestionsStore();
  const eventId = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
  await store.start(eventId, 0);
  // Phase one is five participants x (30 + 45 + 60) seconds plus three reading
  // gaps — about 11m40s. Fifteen minutes is comfortably past every deadline, so
  // the lazy model has run it out by the first read.
  const phaseOneOver = 15 * 60 * 1_000;
  expect((await store.get(eventId, phaseOneOver)).status).toBe("phase_complete");

  const first = await store.continueToPhaseTwo(eventId, phaseOneOver);
  const duplicate = await store.continueToPhaseTwo(eventId, phaseOneOver + 5_000);
  expect(first.phaseId).toBe("phase_2");
  expect(duplicate).toEqual(first);

  const finished = await store.get(
    eventId,
    phaseOneOver + SHARED_CHALLENGE_SECONDS * 1_000 + 1,
  );
  if (finished.phaseId !== "phase_2") throw new Error("expected a phase two session");
  expect(finished.status).toBe("complete");
});
