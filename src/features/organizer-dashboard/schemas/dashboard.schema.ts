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

// The backend returns both lists already sorted by count descending, so the
// chart renders them in the order they arrive rather than re-sorting and
// risking a different answer than the one the API settled on.
export const intentCountSchema = z.object({
  value: z.string(),
  count: z.number(),
});

export const intentSchema = z.object({
  respondents: z.number(),
  asks: z.array(intentCountSchema),
  offers: z.array(intentCountSchema),
});

export type DashboardIntent = z.infer<typeof intentSchema>;

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

// Mutual reconnects. `responders` rides along as the denominator: the count on
// its own invites a percentage, and the honest phrasing is "31 of the 34 people
// who answered" rather than a percentage of a number nobody stated.
export const outcomesSchema = z.object({
  responders: z.number(),
  selected_someone: z.number(),
  mutual_pairs: z.number(),
  per_table: z.array(z.object({ index: z.number(), mutual: z.number() })),
});

export type DashboardOutcomes = z.infer<typeof outcomesSchema>;

// Bands, never a score. The backend converts the raw match figure into
// strong/good/mixed before it leaves the server, because a decimal on this
// screen would imply a precision the model does not have.
export const bonusIntroListSchema = z.array(
  z.object({
    person_a: z.string(),
    person_b: z.string(),
    strength: z.enum(["strong", "good", "mixed"]),
  }),
);
