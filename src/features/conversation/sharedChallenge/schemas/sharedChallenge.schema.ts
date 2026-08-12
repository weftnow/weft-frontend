import { z } from "zod";
import { eventIdSchema } from "../../fastQuestions/schemas/fastQuestions.schema";

const timestampSchema = z.iso.datetime({ offset: true });

/**
 * Phase 2 is a group discussion: one question, one deadline, nobody's turn.
 * There is deliberately no participant list, round index or turn index here —
 * the screen has no use for them, and modelling them would invite a UI that
 * pretends Phase 2 has turns.
 *
 * `challenge` allows the empty string rather than rejecting it: an empty
 * challenge cannot happen (the pool is seeded with pre-written fallbacks
 * before the AI is ever called), and a schema that threw on one would turn an
 * impossible backend state into a blank error screen. The discussion screen
 * guards it instead.
 */
export const sharedChallengeSessionSchema = z
  .object({
    eventId: eventIdSchema,
    phaseId: z.literal("phase_2"),
    language: z.enum(["en", "es"]),
    status: z.enum(["active", "complete"]),
    challenge: z.string(),
    timerStartedAt: timestampSchema.nullable(),
    timerEndsAt: timestampSchema.nullable(),
    closingLine: z.string().nullable(),
  })
  .superRefine((session, context) => {
    if (session.status === "active" && session.timerEndsAt === null) {
      context.addIssue({
        code: "custom",
        path: ["timerEndsAt"],
        message: "An active shared challenge requires a deadline",
      });
    }
    if (session.status === "complete" && session.timerEndsAt !== null) {
      context.addIssue({
        code: "custom",
        path: ["timerEndsAt"],
        message: "A complete shared challenge cannot carry a deadline",
      });
    }
  });
