import { createMockFastQuestionsSession } from "../../data/mockFastQuestions";
import { advanceParticipantAt, advanceSessionAt, startSessionAt } from "../../model/fastQuestions.machine";
import type { AdvanceParticipantInput, FastQuestionsSession } from "../../types/fastQuestions.types";

export type MockFastQuestionsStore = {
  get(eventId: string, now?: number): Promise<FastQuestionsSession>;
  start(eventId: string, now?: number): Promise<FastQuestionsSession>;
  advance(
    eventId: string,
    expected: AdvanceParticipantInput,
    now?: number,
  ): Promise<FastQuestionsSession>;
};

export function createMockFastQuestionsStore(): MockFastQuestionsStore {
  const sessions = new Map<string, FastQuestionsSession>();

  function read(eventId: string): FastQuestionsSession {
    const existing = sessions.get(eventId);
    if (existing) return existing;
    return createMockFastQuestionsSession(eventId);
  }

  function persist(eventId: string, session: FastQuestionsSession): FastQuestionsSession {
    sessions.set(eventId, session);
    return session;
  }

  return {
    async get(eventId, now = Date.now()) {
      return persist(eventId, advanceSessionAt(read(eventId), now));
    },
    async start(eventId, now = Date.now()) {
      return persist(eventId, startSessionAt(read(eventId), now));
    },
    async advance(eventId, expected, now = Date.now()) {
      return persist(eventId, advanceParticipantAt(read(eventId), expected, now));
    },
  };
}
