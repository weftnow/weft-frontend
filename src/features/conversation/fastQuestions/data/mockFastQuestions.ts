import type { ConversationLanguage } from "../../i18n/conversation.messages";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { FastQuestionsSession } from "../types/fastQuestions.types";

type MockEnvironment = {
  NODE_ENV?: string;
  WEFT_FAST_QUESTIONS_DEV_SECONDS?: string;
  WEFT_CONVERSATION_LANGUAGE?: string;
};

const rounds = [
  {
    id: "round_1",
    participantDurationSeconds: 30,
    question: {
      en: "What's one thing you're working on right now?",
      es: "¿En qué estás trabajando ahora mismo?",
    },
  },
  {
    id: "round_2",
    participantDurationSeconds: 45,
    question: {
      en: "What's something you're trying to figure out right now?",
      es: "¿Qué estás tratando de resolver en este momento?",
    },
  },
  {
    id: "round_3",
    participantDurationSeconds: 60,
    question: {
      en: "What's one thing someone in this group might be able to help you with?",
      es: "¿En qué podría ayudarte alguien de este grupo?",
    },
  },
] as const;

function overrideFor(environment: MockEnvironment): number | null {
  if (environment.NODE_ENV === "production") return null;
  const value = Number(environment.WEFT_FAST_QUESTIONS_DEV_SECONDS);
  return Number.isInteger(value) && value >= 1 && value <= 60 ? value : null;
}

/**
 * The real language comes from the session the backend created for the group.
 * The mock has no such session, so it takes one from the environment — the
 * only way to see the Spanish screens locally.
 */
function languageFor(environment: MockEnvironment): ConversationLanguage {
  return environment.WEFT_CONVERSATION_LANGUAGE === "es" ? "es" : "en";
}

export function createMockFastQuestionsSession(
  eventId: string,
  environment: MockEnvironment = process.env,
): FastQuestionsSession {
  const override = overrideFor(environment);
  const language = languageFor(environment);
  return fastQuestionsSessionSchema.parse({
    eventId,
    phaseId: "phase_1",
    type: "fast_questions",
    language,
    status: "waiting",
    roundIndex: 0,
    participantIndex: 0,
    timerStartedAt: null,
    timerEndsAt: null,
    participants: [
      { id: "antonio", firstName: "Antonio", isCurrentUser: false },
      { id: "maria", firstName: "María", isCurrentUser: false },
      { id: "sofia", firstName: "Sofía", isCurrentUser: false },
      { id: "david", firstName: "David", isCurrentUser: false },
      { id: "you", firstName: "You", isCurrentUser: true },
    ],
    rounds: rounds.map((round) => ({
      id: round.id,
      question: round.question[language],
      participantDurationSeconds: override ?? round.participantDurationSeconds,
    })),
  });
}
