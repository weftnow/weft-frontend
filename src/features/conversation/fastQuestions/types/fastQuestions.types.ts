import type { z } from "zod";
import type {
  advanceParticipantInputSchema,
  fastQuestionRoundSchema,
  fastQuestionsSessionSchema,
  participantSchema,
} from "../schemas/fastQuestions.schema";

export type Participant = z.infer<typeof participantSchema>;
export type FastQuestionRound = z.infer<typeof fastQuestionRoundSchema>;
export type FastQuestionsSession = z.infer<typeof fastQuestionsSessionSchema>;
export type AdvanceParticipantInput = z.infer<typeof advanceParticipantInputSchema>;
export type FastQuestionsViewState =
  | "round_intro"
  | "participant_active"
  | "participant_transition"
  | "round_transition"
  | "phase_complete";
export type FastQuestionsApi = {
  getConversationSession(eventId: string): Promise<FastQuestionsSession>;
  startFastQuestionsPhase(eventId: string): Promise<FastQuestionsSession>;
  advanceParticipantTurn(
    eventId: string,
    expected: AdvanceParticipantInput,
  ): Promise<FastQuestionsSession>;
};
