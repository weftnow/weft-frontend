import { describe, expect, test } from "bun:test";
import { formatEventDate } from "./eventDate.model";

describe("formatEventDate", () => {
  test("reads the calendar date the organizer set, not the viewer's timezone", () => {
    // 19:00 in Bogotá is 00:00 the next day in UTC. Going through Date would
    // move this event to the 22nd on a UTC server.
    expect(formatEventDate("2026-08-21T19:00:00-05:00")).toBe("21 August 2026");
  });

  test("formats a plain UTC timestamp", () => {
    expect(formatEventDate("2026-01-05T18:30:00Z")).toBe("5 January 2026");
  });

  test("formats a date with no time at all", () => {
    expect(formatEventDate("2026-12-31")).toBe("31 December 2026");
  });

  test("an event with no date has no date line", () => {
    expect(formatEventDate(null)).toBeNull();
  });

  test("garbage is dropped rather than rendered as Invalid Date", () => {
    expect(formatEventDate("soon")).toBeNull();
    expect(formatEventDate("2026-13-01")).toBeNull();
  });
});
