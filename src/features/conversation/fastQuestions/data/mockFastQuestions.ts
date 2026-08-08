import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { FastQuestionsSession } from "../types/fastQuestions.types";

type MockEnvironment = {
  NODE_ENV?: string;
  WEFT_FAST_QUESTIONS_DEV_SECONDS?: string;
};

const rounds = [
  { id: "round_1", question: "What's one thing you're working on right now?", participantDurationSeconds: 30 },
  { id: "round_2", question: "What's something you're trying to figure out right now?", participantDurationSeconds: 45 },
  { id: "round_3", question: "What's one thing someone in this group might be able to help you with?", participantDurationSeconds: 60 },
] as const;

function overrideFor(environment: MockEnvironment): number | null {
  if (environment.NODE_ENV === "production") return null;
  const value = Number(environment.WEFT_FAST_QUESTIONS_DEV_SECONDS);
  return Number.isInteger(value) && value >= 1 && value <= 10 ? value : null;
}

export function createMockFastQuestionsSession(
  eventId: string,
  environment: MockEnvironment = process.env,
): FastQuestionsSession {
  const override = overrideFor(environment);
  return fastQuestionsSessionSchema.parse({
    eventId,
    phaseId: "phase_1",
    type: "fast_questions",
    status: "waiting",
    roundIndex: 0,
    participantIndex: 0,
    timerStartedAt: null,
    timerEndsAt: null,
    participants: [
      { id: "antonio", firstName: "Antonio", avatarUrl: "/placeholders/weft/attendee-01.png", isCurrentUser: false },
      { id: "maria", firstName: "María", avatarUrl: "/placeholders/weft/attendee-02.png", isCurrentUser: false },
      { id: "sofia", firstName: "Sofía", avatarUrl: "/placeholders/weft/attendee-03.png", isCurrentUser: false },
      { id: "david", firstName: "David", avatarUrl: "/placeholders/weft/testimonial-02.png", isCurrentUser: false },
      { id: "you", firstName: "You", avatarUrl: "/placeholders/weft/customer1.jpeg", isCurrentUser: true },
    ],
    rounds: rounds.map((round) => ({
      ...round,
      participantDurationSeconds: override ?? round.participantDurationSeconds,
    })),
  });
}
