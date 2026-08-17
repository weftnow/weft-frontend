import { describe, expect, test } from "bun:test";
import { csvFilename, toCsv } from "./csv.model";

describe("csvFilename", () => {
  test("folds accents and drops characters a filesystem would choke on", () => {
    expect(csvFilename("Founder Night Bogotá")).toBe(
      "founder-night-bogota-attendees.csv",
    );
    expect(csvFilename("Q3 / Kickoff: LATAM")).toBe("q3-kickoff-latam-attendees.csv");
  });

  test("an event named entirely in punctuation still downloads", () => {
    expect(csvFilename("!!!")).toBe("event-attendees.csv");
  });
});

describe("toCsv", () => {
  test("quotes fields containing commas and doubles embedded quotes", () => {
    const csv = toCsv([
      {
        display_name: 'Ana "Anita"',
        email: "ana@x.co",
        phone: null,
        checked_in: true,
        submitted_at: "2026-08-21T19:00:00Z",
        answers: { company: "Fintech, SA", t1: "raise a round" },
      },
    ]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("name,email,phone,company,checked_in,submitted_at,goal");
    expect(row).toContain('"Ana ""Anita"""');
    expect(row).toContain('"Fintech, SA"');
  });

  test("a missing phone becomes an empty field, not the string null", () => {
    const csv = toCsv([
      {
        display_name: "Beto",
        email: "b@x.co",
        phone: null,
        checked_in: false,
        submitted_at: "2026-08-21T19:00:00Z",
        answers: {},
      },
    ]);
    expect(csv.split("\n")[1]).not.toContain("null");
  });
});
