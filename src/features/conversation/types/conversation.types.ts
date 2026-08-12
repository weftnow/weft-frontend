import type { z } from "zod";
import type { AdvanceParticipantInput } from "../fastQuestions/types/fastQuestions.types";
import type { conversationSessionSchema } from "../schemas/conversation.schema";

export type ConversationSession = z.infer<typeof conversationSessionSchema>;

/**
 * Every call the browser can make about a conversation. Phase 1 and Phase 2
 * share one endpoint family, so they share one client: each call returns the
 * whole session, whichever phase it is now in.
 */
export type ConversationApi = {
  getConversationSession(eventId: string): Promise<ConversationSession>;
  startFastQuestionsPhase(eventId: string): Promise<ConversationSession>;
  advanceParticipantTurn(
    eventId: string,
    expected: AdvanceParticipantInput,
  ): Promise<ConversationSession>;
  continueToPhaseTwo(eventId: string): Promise<ConversationSession>;
};
