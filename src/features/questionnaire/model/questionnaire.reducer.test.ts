import { expect, test } from "bun:test";
import { toCompletedRecord } from "../persistence/questionnaire.storage";
import { formDefinitionSchema } from "../schemas/questionnaire.contract.schema";
import { backendFormEn } from "../test/backendFormFixtures";
import { mapQuestionnaireDefinition } from "./questionnaire.mapper";
import {
  createQuestionnaireState,
  questionnaireReducer,
  selectQuestionnaireResult,
  type QuestionnaireState,
} from "./questionnaire.reducer";

const questionnaireEn = mapQuestionnaireDefinition(formDefinitionSchema.parse(backendFormEn));

const COMPLETE_ANSWERS: Record<string, unknown> = {
  name: "Ana",
  email: null,
  phone: "+57 300 000 0000",
  company: "Weft",
  t1: "Raise a seed round for my fintech",
  t2: "An angel who knows LatAm fintech",
  s1_situation: "own_business",
  s1_function: "engineering_product",
  s2: 3,
  s3: "up",
  s4: ["raise_capital"],
  s5: ["experience"],
  s6: 2,
  s7: 2,
  s8: 1,
  s9: 3,
  s10: 3,
};

function answerAll(state: QuestionnaireState): QuestionnaireState {
  let next = state;
  for (const question of questionnaireEn.questions) {
    next = questionnaireReducer(next, {
      type: "answerAccepted",
      questionId: question.id,
      value: COMPLETE_ANSWERS[question.id] as never,
    });
  }
  return next;
}

test("accepted answers advance locally without an API result", () => {
  const state = createQuestionnaireState(questionnaireEn, {
    submissionId: "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
  });
  const started = questionnaireReducer(state, { type: "started" });
  const answered = questionnaireReducer(started, {
    type: "answerAccepted",
    questionId: "name",
    value: "Ana",
  });
  expect(answered.currentQuestionIndex).toBe(1);
  expect(answered.answers.name).toBe("Ana");
  expect(answered.status).toBe("active");
});

test("out-of-order and duplicate answers are rejected", () => {
  const state = questionnaireReducer(
    createQuestionnaireState(questionnaireEn, { submissionId: "sub-1" }),
    { type: "started" },
  );
  expect(() =>
    questionnaireReducer(state, {
      type: "answerAccepted",
      questionId: "email",
      value: null,
    }),
  ).toThrow();

  const answered = questionnaireReducer(state, {
    type: "answerAccepted",
    questionId: "name",
    value: "Ana",
  });
  expect(() =>
    questionnaireReducer(answered, {
      type: "answerAccepted",
      questionId: "name",
      value: "Beto",
    }),
  ).toThrow();
});

test("completion removes personal answers from the durable record", () => {
  const started = questionnaireReducer(
    createQuestionnaireState(questionnaireEn, { submissionId: "sub-2" }),
    { type: "started" },
  );
  const fullyAnsweredState = questionnaireReducer(answerAll(started), {
    type: "submissionSucceeded",
  });
  const completed = toCompletedRecord(fullyAnsweredState);
  expect(completed.status).toBe("completed");
  expect("answers" in completed).toBe(false);
  expect("submissionId" in completed).toBe(false);
});

test("field validation correction retains all other answers", () => {
  const started = questionnaireReducer(
    createQuestionnaireState(questionnaireEn, { submissionId: "sub-3" }),
    { type: "started" },
  );
  const fullyAnsweredState = answerAll(started);
  const failed = questionnaireReducer(fullyAnsweredState, {
    type: "submissionFailed",
    error: { code: "validation", field: "email" },
  });
  expect(failed.correctionQuestionId).toBe("email");
  expect(failed.answers.name).toBe("Ana");
  expect(failed.answers.s10).toBe(3);

  const corrected = questionnaireReducer(failed, {
    type: "answerAccepted",
    questionId: "email",
    value: "ana@example.com",
  });
  expect(corrected.answers.email).toBe("ana@example.com");
  expect(corrected.currentQuestionIndex).toBe(17);
  expect(corrected.correctionQuestionId).toBeNull();
});

test("versionReset clears in-progress answers and starts a new submission id", () => {
  const started = questionnaireReducer(
    createQuestionnaireState(questionnaireEn, { submissionId: "sub-6" }),
    { type: "started" },
  );
  const answered = questionnaireReducer(started, {
    type: "answerAccepted",
    questionId: "name",
    value: "Ana",
  });
  const questionnaireV2 = { ...questionnaireEn, version: "v2" };
  const reset = questionnaireReducer(answered, {
    type: "versionReset",
    questionnaire: questionnaireV2,
    submissionId: "sub-7",
  });
  expect(reset.status).toBe("opening");
  expect(reset.answers).toEqual({});
  expect(reset.currentQuestionIndex).toBe(0);
  expect(reset.submissionId).toBe("sub-7");
  expect(reset.questionnaire.version).toBe("v2");
  expect(reset.resetReason).toBe("versionChanged");
});

test("selectQuestionnaireResult surfaces the welcome message and active question", () => {
  const state = questionnaireReducer(
    createQuestionnaireState(questionnaireEn, { submissionId: "sub-4" }),
    { type: "started" },
  );
  const result = selectQuestionnaireResult(state);
  expect(result.session.conversation[0].type).toBe("question");
  expect(result.session.conversation.at(-1)?.questionId).toBe("name");
  expect(result.session.completed).toBe(false);
});

test("selectQuestionnaireResult appends completion messages once finished", () => {
  const started = questionnaireReducer(
    createQuestionnaireState(questionnaireEn, { submissionId: "sub-5" }),
    { type: "started" },
  );
  const completedState = questionnaireReducer(answerAll(started), {
    type: "submissionSucceeded",
  });
  const result = selectQuestionnaireResult(completedState);
  expect(result.session.completed).toBe(true);
  expect(result.session.conversation.at(-1)?.questionId).toBe("completion-2");
});
