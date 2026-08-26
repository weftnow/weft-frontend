import { z } from "zod";

export const eventStateSchema = z.enum([
  "open",
  "locked",
  "published",
  "live",
  "closed",
  "learned",
]);

/**
 * The five fields the two-pane create screen added.
 *
 * Shared between create and update so the browser cannot enforce one set of
 * rules on the way in and a different set on the way back. Every one is
 * nullable on the backend, so every one is optional here.
 */
const eventDetailFields = {
  ends_at: z.string().nullable().default(null),
  timezone: z.string().max(64).nullable().default(null),
  location: z.string().trim().max(300).nullable().default(null),
  description: z.string().trim().max(5_000).nullable().default(null),
  // ge=1 on the backend: zero is a closed event, which `state` already says.
  capacity: z.number().int().min(1).nullable().default(null),
};

export const eventSummaryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: eventStateSchema,
  starts_at: z.string().nullable(),
  // The backend's EventOut already returns this; the Live tab's failure
  // banner is its only consumer, so it stays optional for the list views.
  partition_error: z.string().nullable().optional(),
  // How an organizer invites anyone: the guest questionnaire lives at
  // /questionnaire/{form_token}. Optional for the same reason as the line
  // above — a field only one view reads must not be able to blank a page by
  // going missing.
  form_token: z.string().optional(),
  // Same reasoning again: the header and Overview read these, the list does
  // not, and a missing one must not cost a render.
  ends_at: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  capacity: z.number().nullable().optional(),
  group_size_target: z.number().optional(),
});

export const eventListSchema = z.array(eventSummaryRowSchema);

export type EventSummaryRow = z.infer<typeof eventSummaryRowSchema>;

/**
 * What the create-event form sends, mirroring the backend's EventCreate.
 *
 * Duplicated on purpose. The browser rejecting exactly what the server would
 * means an empty name never costs a round trip, and it lets the client treat
 * any rejection that gets past this as our bug rather than the organizer's
 * mistake. The price is drift, which the tests beside this file pin down.
 *
 * `lock_rule` is part of EventCreate and deliberately absent here: it is a
 * matching-engine knob with no organizer-facing meaning, and the backend
 * defaults it.
 */
export const eventCreateSchema = z.object({
  // Trim before the length checks, or a name of three spaces passes min(1) and
  // the organizer ends up with an event that renders as nothing.
  name: z.string().trim().min(1).max(200),
  starts_at: z.string().nullable().default(null),
  // 4-6 matches the backend's Field(ge=4, le=6). The matcher is built around
  // tables of roughly five; outside that range it has nothing sensible to do.
  group_size_target: z.number().int().min(4).max(6).default(5),
  ...eventDetailFields,
}).refine(
  (value) => !value.starts_at || !value.ends_at
    || new Date(value.ends_at) > new Date(value.starts_at),
  { message: "ends_at must be after starts_at", path: ["ends_at"] },
);

export type EventCreateRequest = z.input<typeof eventCreateSchema>;
export type EventCreateBody = z.output<typeof eventCreateSchema>;

/**
 * What PATCH sends. Every field optional — including name, which create
 * requires — because a patch that only moves the date must not have to resend
 * the name.
 *
 * `group_size_target` is absent on purpose, mirroring the backend's
 * EventUpdate: the matcher is built around it and the room was scored for it.
 */
export const eventUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  timezone: z.string().max(64).nullable().optional(),
  location: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(5_000).nullable().optional(),
  capacity: z.number().int().min(1).nullable().optional(),
}).refine(
  // Mirrors eventCreateSchema's rule — the backend now enforces this on both
  // POST and PATCH (app/schemas/events.py), and the edit form sends both
  // dates together, so the browser can catch the same backwards range before
  // it costs a round trip.
  (value) => !value.starts_at || !value.ends_at
    || new Date(value.ends_at) > new Date(value.starts_at),
  { message: "ends_at must be after starts_at", path: ["ends_at"] },
);

export type EventUpdateBody = z.output<typeof eventUpdateSchema>;

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
  // The handle this guest can be sent. Not a CSV column: toCsv lists its
  // seven explicitly, and a contact export gets mailed around.
  link_token: z.string(),
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
