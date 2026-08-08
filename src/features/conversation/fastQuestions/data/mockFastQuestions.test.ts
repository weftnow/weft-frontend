import { expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "./mockFastQuestions";

const EVENT_ID = "6d0c6a42-4d67-4f92-bf75-4c93056dca73";

test("uses approved questions and 30/45/60 durations", () => {
  const session = createMockFastQuestionsSession(EVENT_ID, { NODE_ENV: "production" });
  expect(session.rounds.map(({ participantDurationSeconds }) => participantDurationSeconds))
    .toEqual([30, 45, 60]);
  expect(session.rounds[0].question).toBe("What's one thing you're working on right now?");
  expect(session.participants).toHaveLength(5);
});

test("honors the development override but ignores it in production", () => {
  const development = createMockFastQuestionsSession(EVENT_ID, {
    NODE_ENV: "development",
    WEFT_FAST_QUESTIONS_DEV_SECONDS: "5",
  });
  const production = createMockFastQuestionsSession(EVENT_ID, {
    NODE_ENV: "production",
    WEFT_FAST_QUESTIONS_DEV_SECONDS: "5",
  });
  expect(development.rounds.map(({ participantDurationSeconds }) => participantDurationSeconds))
    .toEqual([5, 5, 5]);
  expect(production.rounds.map(({ participantDurationSeconds }) => participantDurationSeconds))
    .toEqual([30, 45, 60]);
});
