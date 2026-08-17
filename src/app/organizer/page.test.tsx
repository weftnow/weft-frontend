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

  test("an organizer with no events is told what to do next, not shown a zero", () => {
    const html = renderToStaticMarkup(<EventsList events={[]} />);
    expect(html).toContain("Create your first event");
  });
});
