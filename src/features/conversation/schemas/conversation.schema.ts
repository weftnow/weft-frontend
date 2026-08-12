import { z } from "zod";
import { fastQuestionsSessionSchema } from "../fastQuestions/schemas/fastQuestions.schema";
import { sharedChallengeSessionSchema } from "../sharedChallenge/schemas/sharedChallenge.schema";

/**
 * The whole conversation, discriminated on phase. One route serves this, so
 * one poll and one query key cover both phases; a second route for Phase 2
 * would mean two polls and a router that had to know which to call before it
 * could ask.
 *
 * A plain union rather than `z.discriminatedUnion` because both members carry
 * their own cross-field refinements, which a plain union accepts without care.
 */
export const conversationSessionSchema = z.union([
  fastQuestionsSessionSchema,
  sharedChallengeSessionSchema,
]);
