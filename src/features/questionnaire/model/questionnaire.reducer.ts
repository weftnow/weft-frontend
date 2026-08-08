import { messagesFor } from "../i18n/questionnaire.messages";
import { parseAnswerForQuestion } from "../schemas/questionnaire.schema";
import type {
  AnswerValue,
  ConversationItem,
  Question,
  Questionnaire,
  QuestionnaireClientErrorData,
} from "../types/questionnaire.types";

export type QuestionnaireStatus = "opening" | "active" | "submitting" | "completed";

export type QuestionnaireState = {
  questionnaire: Questionnaire;
  status: QuestionnaireStatus;
  answers: Record<string, AnswerValue>;
  currentQuestionIndex: number;
  submissionId: string;
  resetReason: "versionChanged" | null;
  submissionError: QuestionnaireClientErrorData | null;
  correctionQuestionId: string | null;
};

export type QuestionnaireAction =
  | { type: "started" }
  | { type: "definitionReplaced"; questionnaire: Questionnaire }
  | { type: "answerAccepted"; questionId: string; value: AnswerValue }
  | { type: "submissionStarted" }
  | { type: "submissionFailed"; error: QuestionnaireClientErrorData }
  | { type: "submissionSucceeded" }
  | { type: "versionReset"; questionnaire: Questionnaire; submissionId: string };

export type QuestionnaireViewResult = {
  questionnaire: Questionnaire;
  session: {
    conversation: ConversationItem[];
    answers: Record<string, AnswerValue>;
    currentQuestionIndex: number;
    completed: boolean;
  };
  // The question a composer should render: the correction target while one
  // is active, otherwise the next unanswered question, or null once every
  // question is answered (nothing left to render until completion settles).
  activeQuestionId: string | null;
};

export function createQuestionnaireState(
  questionnaire: Questionnaire,
  options: { submissionId: string },
): QuestionnaireState {
  return {
    questionnaire,
    status: "opening",
    answers: {},
    currentQuestionIndex: 0,
    submissionId: options.submissionId,
    resetReason: null,
    submissionError: null,
    correctionQuestionId: null,
  };
}

function findQuestion(questionnaire: Questionnaire, questionId: string): Question | null {
  return questionnaire.questions.find((question) => question.id === questionId) ?? null;
}

function applyAnswerAccepted(
  state: QuestionnaireState,
  questionId: string,
  value: AnswerValue,
): QuestionnaireState {
  if (state.status !== "active") {
    throw new Error("Answers can only be accepted while the questionnaire is active");
  }

  if (state.correctionQuestionId !== null) {
    if (state.correctionQuestionId !== questionId) {
      throw new Error("That is not the question being corrected");
    }
    const question = findQuestion(state.questionnaire, questionId);
    if (!question) throw new Error("Unknown question");
    const parsed = parseAnswerForQuestion(question, value);
    return {
      ...state,
      answers: { ...state.answers, [questionId]: parsed },
      currentQuestionIndex: state.questionnaire.questions.length,
      correctionQuestionId: null,
      submissionError: null,
    };
  }

  const activeQuestion = state.questionnaire.questions[state.currentQuestionIndex];
  if (!activeQuestion || activeQuestion.id !== questionId) {
    throw new Error("That is not the active question");
  }
  if (state.answers[questionId] !== undefined) {
    throw new Error("That question has already been answered");
  }

  const parsed = parseAnswerForQuestion(activeQuestion, value);
  return {
    ...state,
    answers: { ...state.answers, [questionId]: parsed },
    currentQuestionIndex: state.currentQuestionIndex + 1,
  };
}

export function questionnaireReducer(
  state: QuestionnaireState,
  action: QuestionnaireAction,
): QuestionnaireState {
  switch (action.type) {
    case "started":
      return state.status === "opening" ? { ...state, status: "active" } : state;

    case "definitionReplaced":
      return { ...state, questionnaire: action.questionnaire };

    case "answerAccepted":
      return applyAnswerAccepted(state, action.questionId, action.value);

    case "submissionStarted":
      return { ...state, status: "submitting", submissionError: null };

    case "submissionFailed": {
      const field = action.error.field;
      const correctionQuestionId =
        field && findQuestion(state.questionnaire, field) ? field : null;
      return {
        ...state,
        status: "active",
        submissionError: action.error,
        correctionQuestionId,
      };
    }

    case "submissionSucceeded":
      return { ...state, status: "completed", submissionError: null };

    case "versionReset":
      return {
        questionnaire: action.questionnaire,
        status: "opening",
        answers: {},
        currentQuestionIndex: 0,
        submissionId: action.submissionId,
        resetReason: "versionChanged",
        submissionError: null,
        correctionQuestionId: null,
      };

    default:
      return state;
  }
}

function displayAnswer(question: Question, value: AnswerValue, skippedLabel: string): string {
  if (value === null) return skippedLabel;

  if (Array.isArray(value)) {
    const labels = new Map(
      question.type === "text" ? [] : question.options.map((option) => [option.value, option.label]),
    );
    return value.map((item) => labels.get(item) ?? String(item)).join(" · ");
  }

  if (question.type !== "text") {
    const label = question.options.find((option) => option.value === value)?.label;
    return label ?? String(value);
  }

  return String(value);
}

export function selectQuestionnaireResult(state: QuestionnaireState): QuestionnaireViewResult {
  const copy = messagesFor(state.questionnaire.language);
  const conversation: ConversationItem[] = [
    { id: "weft-intro", type: "question", questionId: "intro", content: copy.welcome },
  ];

  const answeredCount = Math.min(
    state.currentQuestionIndex,
    state.questionnaire.questions.length,
  );
  for (let index = 0; index < answeredCount; index += 1) {
    const question = state.questionnaire.questions[index];
    conversation.push({
      id: `question-${question.id}`,
      type: "question",
      questionId: question.id,
      content: question.message,
    });
    const value = state.answers[question.id] ?? null;
    conversation.push({
      id: `answer-${question.id}`,
      type: "answer",
      questionId: question.id,
      value,
      display: displayAnswer(question, value, copy.skipped),
    });
  }

  if (state.correctionQuestionId) {
    const question = findQuestion(state.questionnaire, state.correctionQuestionId);
    if (question) {
      conversation.push({
        id: `question-${question.id}-correction`,
        type: "question",
        questionId: question.id,
        content: question.message,
      });
    }
  } else {
    const nextQuestion = state.questionnaire.questions[state.currentQuestionIndex];
    if (nextQuestion && state.status !== "completed") {
      conversation.push({
        id: `question-${nextQuestion.id}`,
        type: "question",
        questionId: nextQuestion.id,
        content: nextQuestion.message,
      });
    }
  }

  if (state.status === "completed") {
    copy.completionMessages.forEach((content, index) => {
      conversation.push({
        id: `weft-completion-${index + 1}`,
        type: "question",
        questionId: `completion-${index + 1}`,
        content,
      });
    });
  }

  const activeQuestionId =
    state.correctionQuestionId ??
    (state.currentQuestionIndex < state.questionnaire.questions.length
      ? state.questionnaire.questions[state.currentQuestionIndex].id
      : null);

  return {
    questionnaire: state.questionnaire,
    session: {
      conversation,
      answers: state.answers,
      currentQuestionIndex: state.currentQuestionIndex,
      completed: state.status === "completed",
    },
    activeQuestionId,
  };
}
