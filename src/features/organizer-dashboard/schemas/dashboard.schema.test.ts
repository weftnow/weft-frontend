import { describe, expect, test } from "bun:test";
import {
  eventCreateSchema,
  eventSummaryRowSchema,
} from "./dashboard.schema";

/**
 * These rules exist twice — here and in the backend's EventCreate. That is
 * deliberate: the browser rejecting exactly what the server would means nobody
 * waits on a round trip to be told their event has no name. The cost is that
 * the two can drift, so these tests pin the numbers rather than just the shape.
 */
describe("eventCreateSchema", () => {
  test("a name is enough — table size defaults to five", () => {
    const parsed = eventCreateSchema.parse({ name: "Founder Night" });
    expect(parsed).toEqual({
      name: "Founder Night",
      starts_at: null,
      group_size_target: 5,
    });
  });

  test("surrounding whitespace is trimmed off the name", () => {
    // Otherwise "  " passes a length check and the organizer ends up with an
    // event whose name renders as nothing.
    expect(eventCreateSchema.parse({ name: "  Founder Night  " }).name)
      .toBe("Founder Night");
    expect(eventCreateSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  test("an empty name is rejected before any request goes out", () => {
    expect(eventCreateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  test("a name over 200 characters is rejected, matching the backend", () => {
    expect(eventCreateSchema.safeParse({ name: "x".repeat(201) }).success)
      .toBe(false);
    expect(eventCreateSchema.safeParse({ name: "x".repeat(200) }).success)
      .toBe(true);
  });

  test("table size is held to the four-to-six the matcher accepts", () => {
    expect(eventCreateSchema.safeParse({ name: "N", group_size_target: 4 }).success)
      .toBe(true);
    expect(eventCreateSchema.safeParse({ name: "N", group_size_target: 6 }).success)
      .toBe(true);
    expect(eventCreateSchema.safeParse({ name: "N", group_size_target: 7 }).success)
      .toBe(false);
    expect(eventCreateSchema.safeParse({ name: "N", group_size_target: 3 }).success)
      .toBe(false);
  });

  test("a start time is optional and travels as an ISO string", () => {
    const parsed = eventCreateSchema.parse({
      name: "N",
      starts_at: "2026-09-01T19:00:00.000Z",
    });
    expect(parsed.starts_at).toBe("2026-09-01T19:00:00.000Z");
  });
});

describe("eventSummaryRowSchema", () => {
  test("keeps the form token, which is how an organizer invites anyone", () => {
    const parsed = eventSummaryRowSchema.parse({
      id: "e1",
      name: "Founder Night",
      state: "open",
      starts_at: null,
      form_token: "abc123",
    });
    expect(parsed.form_token).toBe("abc123");
  });

  test("still parses a row with no form token, as partition_error does", () => {
    // Same reasoning as partition_error above it: a field the list views do not
    // need must not be able to blank the whole page by going missing.
    const parsed = eventSummaryRowSchema.safeParse({
      id: "e1",
      name: "Founder Night",
      state: "open",
      starts_at: null,
    });
    expect(parsed.success).toBe(true);
  });
});
