import { expect, test } from "bun:test";
import {
  completeQuestionnaire,
  createMemoryQuestionnaireStorage,
  getQuestionnaire,
  submitAnswer,
} from "./questionnaire.api";

test("getQuestionnaire creates a resumable opening conversation", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const first = await getQuestionnaire(storage);
  const resumed = await getQuestionnaire(storage);

  expect(first.isNewSession).toBe(true);
  expect(first.session.conversation.map((item) => item.type)).toEqual([
    "question",
    "question",
  ]);
  expect(resumed.isNewSession).toBe(false);
  expect(resumed.session).toEqual(first.session);
});

test("submitAnswer persists the canonical answer and next Weft question", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const initial = await getQuestionnaire(storage);
  const firstQuestion = initial.questionnaire.questions[0];
  const option =
    firstQuestion.type === "single_choice"
      ? firstQuestion.options[0].value
      : "";
  const result = await submitAnswer(
    { questionId: firstQuestion.id, value: option },
    storage,
  );

  expect(result.session.answers[firstQuestion.id]).toBe(option);
  expect(result.session.currentQuestionIndex).toBe(1);
  expect(result.session.conversation.at(-2)?.type).toBe("answer");
  expect(result.session.conversation.at(-1)?.type).toBe("question");
});

test("submitAnswer rejects duplicate and out-of-order submissions", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const initial = await getQuestionnaire(storage);
  const question = initial.questionnaire.questions[1];
  let message = "";

  try {
    await submitAnswer({ questionId: question.id, value: "x" }, storage);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  expect(message).toContain("active question");
});

test("completeQuestionnaire appends exact completion copy once", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const initial = await getQuestionnaire(storage);

  for (const question of initial.questionnaire.questions) {
    const value =
      question.type === "multiple_choice"
        ? question.options
            .slice(0, question.minSelections ?? 1)
            .map((option) => option.value)
        : question.type === "text"
          ? "A useful answer"
          : question.options[0].value;
    await submitAnswer({ questionId: question.id, value }, storage);
  }

  const completed = await completeQuestionnaire(storage);
  const repeated = await completeQuestionnaire(storage);
  expect(completed.session.completed).toBe(true);
  expect(repeated.session.conversation).toEqual(
    completed.session.conversation,
  );
  expect(
    completed.session.conversation.slice(-2).map((item) =>
      item.type === "question" ? item.content : "",
    ),
  ).toEqual(completed.questionnaire.completionMessages);
});

test("corrupt or version-incompatible storage restarts safely", async () => {
  const corrupt = createMemoryQuestionnaireStorage("not-json");
  expect((await getQuestionnaire(corrupt)).isNewSession).toBe(true);

  const wrongVersion = createMemoryQuestionnaireStorage(
    JSON.stringify({
      questionnaireId: "weft-networking-night",
      questionnaireVersion: "v999",
      conversation: [],
      answers: {},
      currentQuestionIndex: 0,
      completed: false,
      updatedAt: new Date().toISOString(),
    }),
  );
  expect((await getQuestionnaire(wrongVersion)).isNewSession).toBe(true);
});

test("unavailable storage falls back without breaking the active visit", async () => {
  const unavailable = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };

  const result = await getQuestionnaire(unavailable);
  expect(result.session.currentQuestionIndex).toBe(0);
  expect(result.session.conversation).toHaveLength(2);
});
