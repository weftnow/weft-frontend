import { z } from "zod";

export const eventStateSchema = z.enum([
  "open",
  "locked",
  "published",
  "live",
  "closed",
  "learned",
]);

export const eventSummaryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: eventStateSchema,
  starts_at: z.string().nullable(),
  // The backend's EventOut already returns this; the Live tab's failure
  // banner is its only consumer, so it stays optional for the list views.
  partition_error: z.string().nullable().optional(),
});

export const eventListSchema = z.array(eventSummaryRowSchema);

export type EventSummaryRow = z.infer<typeof eventSummaryRowSchema>;

export const summarySchema = z.object({
  plan: z.enum(["free", "pro"]),
  submitted: z.number(),
  checked_in: z.number(),
  groups: z.number(),
  seated: z.number(),
  confirmed: z.number(),
  feedback_responses: z.number(),
  average_rating: z.number().nullable(),
  // Keys arrive as strings: the backend types this dict[int, int], and JSON
  // object keys are always strings on the wire.
  rating_distribution: z.record(z.string(), z.number()),
  would_attend_again_pct: z.number().nullable(),
  comments: z.array(z.string()),
  suppressed: z.boolean(),
});

export type DashboardSummary = z.infer<typeof summarySchema>;

// One row of the paid attendee directory, mirroring DashboardResponseOut in
// app/schemas/attendees.py. Declared here rather than beside the table
// component because the CSV exporter needs the same shape.
export const attendeeRowSchema = z.object({
  display_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  checked_in: z.boolean(),
  submitted_at: z.string(),
  answers: z.record(z.string(), z.unknown()),
});

export const attendeeListSchema = z.array(attendeeRowSchema);

export type AttendeeRow = z.infer<typeof attendeeRowSchema>;
