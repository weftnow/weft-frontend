import { z } from "zod";

export const eventIdSchema = z.uuid();
export const participantSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1).max(80),
  avatarUrl: z.string().min(1),
  isCurrentUser: z.boolean(),
});
export const fastQuestionRoundSchema = z.object({
  id: z.string().min(1),
  question: z.string().trim().min(1).max(220),
  participantDurationSeconds: z.number().int().min(1).max(600),
});
const timestampSchema = z.iso.datetime({ offset: true });

export const fastQuestionsSessionSchema = z
  .object({
    eventId: eventIdSchema,
    phaseId: z.literal("phase_1"),
    type: z.literal("fast_questions"),
    status: z.enum(["waiting", "active", "phase_complete"]),
    roundIndex: z.number().int().min(0).max(2),
    participantIndex: z.number().int().min(0),
    timerStartedAt: timestampSchema.nullable(),
    timerEndsAt: timestampSchema.nullable(),
    participants: z.array(participantSchema).min(3).max(6),
    rounds: z.array(fastQuestionRoundSchema).length(3),
  })
  .superRefine((session, context) => {
    if (new Set(session.participants.map(({ id }) => id)).size !== session.participants.length) {
      context.addIssue({ code: "custom", path: ["participants"], message: "Duplicate participant IDs" });
    }
    if (new Set(session.rounds.map(({ id }) => id)).size !== session.rounds.length) {
      context.addIssue({ code: "custom", path: ["rounds"], message: "Duplicate round IDs" });
    }
    if (session.participants.filter(({ isCurrentUser }) => isCurrentUser).length !== 1) {
      context.addIssue({ code: "custom", path: ["participants"], message: "Exactly one current user is required" });
    }
    if (session.participantIndex >= session.participants.length) {
      context.addIssue({ code: "custom", path: ["participantIndex"], message: "Participant index is out of range" });
    }
    const hasTimer = session.timerStartedAt !== null && session.timerEndsAt !== null;
    if (session.status === "active" && !hasTimer) {
      context.addIssue({ code: "custom", path: ["timerEndsAt"], message: "Active sessions require timestamps" });
    }
    if (session.status !== "active" && (session.timerStartedAt !== null || session.timerEndsAt !== null)) {
      context.addIssue({ code: "custom", path: ["timerEndsAt"], message: "Inactive sessions cannot carry timestamps" });
    }
  });

export const advanceParticipantInputSchema = z.object({
  roundIndex: z.number().int().min(0).max(2),
  participantIndex: z.number().int().min(0),
});
