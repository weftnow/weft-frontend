import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EventsList, OrganizerUnavailable, dynamic, metadata } from "./page";

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
