import type { ConversationSession } from "../../../types/conversation.types";
import { createMockFastQuestionsSession } from "../../data/mockFastQuestions";
import {
  advanceParticipantAt,
  advanceSessionAt,
  continueToPhaseTwoAt,
  startSessionAt,
} from "../../model/fastQuestions.machine";
import type { AdvanceParticipantInput } from "../../types/fastQuestions.types";

export type MockFastQuestionsStore = {
  get(eventId: string, now?: number): Promise<ConversationSession>;
  start(eventId: string, now?: number): Promise<ConversationSession>;
  advance(
    eventId: string,
    expected: AdvanceParticipantInput,
    now?: number,
  ): Promise<ConversationSession>;
  continueToPhaseTwo(eventId: string, now?: number): Promise<ConversationSession>;
};

export function createMockFastQuestionsStore(): MockFastQuestionsStore {
  const sessions = new Map<string, ConversationSession>();

  function read(eventId: string): ConversationSession {
    const existing = sessions.get(eventId);
    if (existing) return existing;
    return createMockFastQuestionsSession(eventId);
  }

  function persist(eventId: string, session: ConversationSession): ConversationSession {
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
    async continueToPhaseTwo(eventId, now = Date.now()) {
      return persist(eventId, continueToPhaseTwoAt(read(eventId), now));
    },
  };
}
