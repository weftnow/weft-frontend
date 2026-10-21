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
   * Refs of the tablemates this guest would meet again. Empty is a real
   * answer — "nobody" is allowed and is not the same as skipping the question.
   *
   * Refs, not display names: two guests at one table can share a name, and a
   * name would credit whichever of them the backend looked up first. A ref is
   * an opaque signature the backend issued, so no tablemate id ever reaches
   * the browser either.
   */
  meetAgainRefs: z.array(z.string().trim().min(1).max(400)).max(20).default([]),
});

export type EventFeedbackSubmission = z.infer<typeof eventFeedbackSubmissionSchema>;

export const tablemateSchema = z.object({
  displayName: z.string().min(1),
  /** Opaque handle from the backend. The only thing that identifies a person. */
  ref: z.string().min(1),
});

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
  tablemates: z.array(z.object({ display_name: z.string().min(1), ref: z.string().min(1) })),
});
