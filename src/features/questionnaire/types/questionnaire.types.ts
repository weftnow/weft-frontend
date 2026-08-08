import type { z } from "zod";
import type {
  answerScalarSchema,
  answerValueSchema,
  conversationItemSchema,
  optionSchema,
  questionnaireResultSchema,
  questionnaireSchema,
  questionSchema,
  sessionSchema,
  submitAnswerInputSchema,
} from "../schemas/questionnaire.schema";

export type Option = z.infer<typeof optionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Questionnaire = z.infer<typeof questionnaireSchema>;
export type ConversationItem = z.infer<typeof conversationItemSchema>;
export type QuestionnaireSession = z.infer<typeof sessionSchema>;
export type QuestionnaireResult = z.infer<typeof questionnaireResultSchema>;
export type AnswerScalar = z.infer<typeof answerScalarSchema>;
export type AnswerValue = z.infer<typeof answerValueSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerInputSchema>;

export type ConversationPhase =
  | "weft_typing"
  | "awaiting_answer"
  | "submitting_answer"
  | "transitioning"
  | "completed";

export type QuestionnaireErrorCode =
  | "invalidLink"
  | "notFound"
  | "notAccepting"
  | "validation"
  | "versionConflict"
  | "idempotencyConflict"
  | "unavailable";

export type QuestionnaireClientErrorData = {
  code: QuestionnaireErrorCode;
  field?: string;
};
