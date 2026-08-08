import { mockQuestionnaire } from "../data/mockQuestionnaire";
import { messagesFor } from "../i18n/questionnaire.messages";
import {
  parseAnswerForQuestion,
  questionnaireResultSchema,
  questionnaireSchema,
  sessionSchema,
  submitAnswerInputSchema,
} from "../schemas/questionnaire.schema";
import type {
  AnswerValue,
  Question,
  Questionnaire,
  QuestionnaireResult,
  QuestionnaireSession,
  SubmitAnswerInput,
} from "../types/questionnaire.types";

export type QuestionnaireStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type QuestionnaireApi = {
  getQuestionnaire(): Promise<QuestionnaireResult>;
  submitAnswer(input: SubmitAnswerInput): Promise<QuestionnaireResult>;
  completeQuestionnaire(): Promise<QuestionnaireResult>;
};

export const QUESTIONNAIRE_STORAGE_KEY = "weft:attendee-questionnaire:v1";

const BROWSER_DELAY_MS = 90;
const fallbackByStorage = new WeakMap<object, QuestionnaireStorage>();
const serverStorage = createMemoryQuestionnaireStorage();

export function createMemoryQuestionnaireStorage(
  initialValue?: string,
): QuestionnaireStorage {
  const values = new Map<string, string>();
  if (initialValue !== undefined) {
    values.set(QUESTIONNAIRE_STORAGE_KEY, initialValue);
  }

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function safeStorage(storage: QuestionnaireStorage): QuestionnaireStorage {
  let fallback = fallbackByStorage.get(storage);
  if (!fallback) {
    fallback = createMemoryQuestionnaireStorage();
    fallbackByStorage.set(storage, fallback);
  }

  return {
    getItem(key) {
      try {
        return storage.getItem(key) ?? fallback.getItem(key);
      } catch {
        return fallback.getItem(key);
      }
    },
    setItem(key, value) {
      fallback.setItem(key, value);
      try {
        storage.setItem(key, value);
      } catch {
        // The in-memory mirror keeps the current visit usable.
      }
    },
  };
}

function defaultStorage(): QuestionnaireStorage {
  if (typeof window === "undefined") return serverStorage;
  try {
    return window.localStorage;
  } catch {
    return serverStorage;
  }
}

async function waitForMockNetwork(enabled: boolean) {
  if (!enabled) return;
  await new Promise((resolve) => setTimeout(resolve, BROWSER_DELAY_MS));
}

function currentQuestionnaire(): Questionnaire {
  return questionnaireSchema.parse(mockQuestionnaire);
}

function createSession(questionnaire: Questionnaire): QuestionnaireSession {
  const firstQuestion = questionnaire.questions[0];
  return {
    questionnaireId: questionnaire.id,
    questionnaireVersion: questionnaire.version,
    conversation: [
      {
        id: "weft-intro",
        type: "question",
        questionId: "intro",
        content: questionnaire.intro.welcome,
      },
      {
        id: `question-${firstQuestion.id}`,
        type: "question",
        questionId: firstQuestion.id,
        content: firstQuestion.message,
      },
    ],
    answers: {},
    currentQuestionIndex: 0,
    completed: false,
    updatedAt: new Date().toISOString(),
  };
}

function sessionIsCompatible(
  session: QuestionnaireSession,
  questionnaire: Questionnaire,
) {
  if (
    session.questionnaireId !== questionnaire.id ||
    session.questionnaireVersion !== questionnaire.version ||
    session.currentQuestionIndex > questionnaire.questions.length
  ) {
    return false;
  }

  const questions = new Map(
    questionnaire.questions.map((question) => [question.id, question]),
  );

  try {
    for (const [questionId, answer] of Object.entries(session.answers)) {
      const question = questions.get(questionId);
      if (!question) return false;
      parseAnswerForQuestion(question, answer);
    }
  } catch {
    return false;
  }

  const allowedConversationIds = new Set([
    "intro",
    "completion-1",
    "completion-2",
    ...questions.keys(),
  ]);
  if (
    session.conversation.some(
      (item) => !allowedConversationIds.has(item.questionId),
    )
  ) {
    return false;
  }

  return !session.completed || session.currentQuestionIndex === questionnaire.questions.length;
}

function readSession(
  storage: QuestionnaireStorage,
  questionnaire: Questionnaire,
): QuestionnaireSession | null {
  const raw = storage.getItem(QUESTIONNAIRE_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = sessionSchema.parse(JSON.parse(raw));
    return sessionIsCompatible(parsed, questionnaire) ? parsed : null;
  } catch {
    return null;
  }
}

function persistSession(
  storage: QuestionnaireStorage,
  session: QuestionnaireSession,
) {
  storage.setItem(QUESTIONNAIRE_STORAGE_KEY, JSON.stringify(session));
}

function result(
  questionnaire: Questionnaire,
  session: QuestionnaireSession,
  isNewSession: boolean,
) {
  return questionnaireResultSchema.parse({
    questionnaire,
    session,
    isNewSession,
  });
}

function displayAnswer(
  questionnaire: Questionnaire,
  question: Question,
  value: AnswerValue,
) {
  if (value === null) return messagesFor(questionnaire.language).skipped;

  if (Array.isArray(value)) {
    const labels = new Map(
      question.type === "text"
        ? []
        : question.options.map((option) => [option.value, option.label]),
    );
    return value.map((item) => labels.get(item) ?? String(item)).join(" · ");
  }

  if (question.type !== "text") {
    const label = question.options.find((option) => option.value === value)?.label;
    return label ?? String(value);
  }

  return String(value);
}

export async function getQuestionnaire(
  injectedStorage?: QuestionnaireStorage,
): Promise<QuestionnaireResult> {
  await waitForMockNetwork(injectedStorage === undefined);
  const questionnaire = currentQuestionnaire();
  const storage = safeStorage(injectedStorage ?? defaultStorage());
  const storedSession = readSession(storage, questionnaire);
  if (storedSession) return result(questionnaire, storedSession, false);

  const session = createSession(questionnaire);
  persistSession(storage, session);
  return result(questionnaire, session, true);
}

export async function submitAnswer(
  input: SubmitAnswerInput,
  injectedStorage?: QuestionnaireStorage,
): Promise<QuestionnaireResult> {
  const parsedInput = submitAnswerInputSchema.parse(input);
  const current = await getQuestionnaire(injectedStorage);
  const { questionnaire } = current;
  const question = questionnaire.questions[current.session.currentQuestionIndex];

  if (!question || question.id !== parsedInput.questionId) {
    throw new Error("That is not the active question");
  }
  if (current.session.answers[question.id] !== undefined) {
    throw new Error("That question has already been answered");
  }

  const answer = parseAnswerForQuestion(question, parsedInput.value);
  const nextQuestionIndex = current.session.currentQuestionIndex + 1;
  const nextQuestion = questionnaire.questions[nextQuestionIndex];
  const session: QuestionnaireSession = {
    ...current.session,
    answers: { ...current.session.answers, [question.id]: answer },
    currentQuestionIndex: nextQuestionIndex,
    conversation: [
      ...current.session.conversation,
      {
        id: `answer-${question.id}`,
        type: "answer",
        questionId: question.id,
        value: answer,
        display: displayAnswer(questionnaire, question, answer),
      },
      ...(nextQuestion
        ? [
            {
              id: `question-${nextQuestion.id}`,
              type: "question" as const,
              questionId: nextQuestion.id,
              content: nextQuestion.message,
            },
          ]
        : []),
    ],
    updatedAt: new Date().toISOString(),
  };

  persistSession(safeStorage(injectedStorage ?? defaultStorage()), session);
  return result(questionnaire, session, false);
}

export async function completeQuestionnaire(
  injectedStorage?: QuestionnaireStorage,
): Promise<QuestionnaireResult> {
  const current = await getQuestionnaire(injectedStorage);
  const { questionnaire } = current;

  if (current.session.completed) return current;
  if (
    current.session.currentQuestionIndex !== questionnaire.questions.length ||
    questionnaire.questions.some(
      (question) => current.session.answers[question.id] === undefined,
    )
  ) {
    throw new Error("The questionnaire is not ready to complete");
  }

  const completionItems = questionnaire.completionMessages.map(
    (content, index) => ({
      id: `weft-completion-${index + 1}`,
      type: "question" as const,
      questionId: `completion-${index + 1}`,
      content,
    }),
  );
  const session: QuestionnaireSession = {
    ...current.session,
    completed: true,
    conversation: [...current.session.conversation, ...completionItems],
    updatedAt: new Date().toISOString(),
  };

  persistSession(safeStorage(injectedStorage ?? defaultStorage()), session);
  return result(questionnaire, session, false);
}

export const questionnaireApi: QuestionnaireApi = {
  getQuestionnaire: () => getQuestionnaire(),
  submitAnswer: (input) => submitAnswer(input),
  completeQuestionnaire: () => completeQuestionnaire(),
};
