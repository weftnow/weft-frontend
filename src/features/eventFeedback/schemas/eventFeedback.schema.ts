import { z } from "zod";

/**
 * The answers, in the frontend's camelCase vocabulary. The gateway is the only
 * place that knows the backend's snake_case names.
 *
 * Both scales are 1-5, low to high, and the bounds match the database check
 * constraints behind them — a value that passes here cannot be rejected
 * downstream for being out of range.
 */
export const eventFeedbackSubmissionSchema = z.object({
  recommendScore: z.number().int().min(1).max(5),
  rating: z.number().int().min(1).max(5),
  // Trimmed before the length check, exactly as the backend does: a box of
  // spaces is not a filled-in field.
  improvement: z.string().trim().min(1).max(2000),
  /**
   * Display names of tablemates this guest would meet again. Empty is a real
   * answer — "nobody" is allowed and is not the same as skipping the question.
   *
   * Names rather than ids because that is what the backend's per-person
   * feedback endpoint takes, and what its "is this person at your table" check
   * validates against. No id for a tablemate ever reaches the browser.
   */
  meetAgain: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export type EventFeedbackSubmission = z.infer<typeof eventFeedbackSubmissionSchema>;

export const tablemateSchema = z.object({ displayName: z.string().min(1) });

export const eventFeedbackStatusSchema = z.object({
  submitted: z.boolean(),
  /** Empty when the group was never published, or the read failed. */
  tablemates: z.array(tablemateSchema).default([]),
});

export type EventFeedbackStatus = z.infer<typeof eventFeedbackStatusSchema>;

/** Mirrors the backend's `EventFeedbackStatusOut`. */
export const eventFeedbackStatusDtoSchema = z.object({ submitted: z.boolean() });

/** The subset of the backend's `MyTableOut` this feature needs. */
export const myTableDtoSchema = z.object({
  tablemates: z.array(z.object({ display_name: z.string().min(1) })),
});
