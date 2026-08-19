import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EventsList, OrganizerUnavailable, dynamic, metadata } from "./page";
import { SAMPLE_NIGHT } from "@/features/organizer-dashboard/data/sampleNight";

test("protected organizer route is dynamic and private", () => {
  expect(dynamic).toBe("force-dynamic");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("temporary backend failure has a retry without pretending logout", () => {
  const html = renderToStaticMarkup(<OrganizerUnavailable />);
  expect(html).toContain('href="/organizer"');
  expect(html).toContain("Try again");
  expect(html).not.toContain("Sign in");
});

describe("EventsList", () => {
  test("links each event to its dashboard and shows its state", () => {
    const html = renderToStaticMarkup(
      <EventsList
        events={[
          { id: "e1", name: "Founder Night Bogotá", state: "closed", starts_at: null },
        ]}
      />,
    );
    expect(html).toContain("Founder Night Bogot");
    expect(html).toContain("/organizer/events/e1");
    expect(html).toContain("closed");
  });

  test("an organizer with no events gets the form, not a note about the absence", () => {
    // The old copy told them to create an event and gave them no way to do it.
    const html = renderToStaticMarkup(<EventsList events={[]} />);
    expect(html).toContain('name="name"');
    expect(html).toContain("Create event");
    expect(html).not.toContain("No events yet");
  });

  test("a first-timer is told what happens after they press create", () => {
    // The form alone answers "what do I type"; it never answered "and then
    // what?" — which is the question that decides whether they finish setup.
    const html = renderToStaticMarkup(<EventsList events={[]} />);
    expect(html).toContain("Share the link");
    expect(html).toContain("Tables revealed");
  });

  test("a first-timer can see a finished night before running one", () => {
    const html = renderToStaticMarkup(<EventsList events={[]} />);
    expect(html).toContain('href="/organizer/sample"');
  });

  test("the arc and the sample belong to the empty screen only", () => {
    // An organizer with events has already been through this; repeating the
    // pitch on every visit turns orientation into clutter.
    const html = renderToStaticMarkup(
      <EventsList
        events={[
          { id: "e1", name: "Founder Night Bogotá", state: "closed", starts_at: null },
        ]}
      />,
    );
    expect(html).not.toContain('href="/organizer/sample"');
    expect(html).not.toContain("Share the link");
  });

  test("an organizer who already has events can still start another", () => {
    const html = renderToStaticMarkup(
      <EventsList
        events={[
          { id: "e1", name: "Founder Night Bogotá", state: "closed", starts_at: null },
        ]}
      />,
    );
    expect(html).toContain("New event");
  });
});

describe("the sample night", () => {
  test("is a room the real partitioner could actually have produced", () => {
    // Tables of 4-6 is what app/matching/groups.py builds. A sample outside
    // that range teaches a new organizer the wrong shape of evening.
    expect(SAMPLE_NIGHT.groups.length).toBeGreaterThan(1);
    for (const group of SAMPLE_NIGHT.groups) {
      expect(group.members.length).toBeGreaterThanOrEqual(4);
      expect(group.members.length).toBeLessThanOrEqual(6);
    }
  });

  test("counts the same room its stats claim", () => {
    const seats = SAMPLE_NIGHT.groups.flatMap((group) => group.members);
    expect(seats.length).toBe(SAMPLE_NIGHT.guests);
    expect(seats.filter((seat) => seat.confirmed).length).toBe(SAMPLE_NIGHT.confirmed);
    // Not everyone finds their table on the first try. A fully filled room is
    // a render, not a night.
    expect(SAMPLE_NIGHT.confirmed).toBeLessThan(SAMPLE_NIGHT.guests);
  });
});
