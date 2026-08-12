import { z } from "zod";

/**
 * The three answers, in the frontend's camelCase vocabulary. The gateway is
 * the only place that knows the backend's snake_case names.
 *
 * The bounds are the same ones the backend enforces with database check
 * constraints — 0-10 and 1-5 — so a value that passes here cannot be rejected
 * downstream for being out of range.
 */
export const eventFeedbackSubmissionSchema = z.object({
  recommendScore: z.number().int().min(0).max(10),
  rating: z.number().int().min(1).max(5),
  // Trimmed before the length check, exactly as the backend does: a box of
  // spaces is not a filled-in field.
  improvement: z.string().trim().min(1).max(2000),
});

export type EventFeedbackSubmission = z.infer<typeof eventFeedbackSubmissionSchema>;

export const eventFeedbackStatusSchema = z.object({ submitted: z.boolean() });

export type EventFeedbackStatus = z.infer<typeof eventFeedbackStatusSchema>;

/** Mirrors the backend's `EventFeedbackStatusOut` / `EventFeedbackRequest`. */
export const eventFeedbackStatusDtoSchema = z.object({ submitted: z.boolean() });
