import { expect, test } from "bun:test";
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
  const stale = await store.advance(eventId, { roundIndex: 0, participantIndex: 1 }, 2_000);
  const valid = await store.advance(eventId, { roundIndex: 0, participantIndex: 0 }, 2_000);
  expect(stale).toEqual(started);
  expect(valid.participantIndex).toBe(1);
});
