import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OrganizerPlaceholder,
  OrganizerUnavailable,
  dynamic,
  metadata,
} from "./page";

test("protected organizer route is dynamic and private", () => {
  expect(dynamic).toBe("force-dynamic");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("authenticated placeholder uses the exact approved copy", () => {
  const html = renderToStaticMarkup(<OrganizerPlaceholder />);
  expect(html).toContain("your event data will appear here");
  expect(html).not.toContain("Create event");
  expect(html).not.toContain("Sign out");
});

test("temporary backend failure has a retry without pretending logout", () => {
  const html = renderToStaticMarkup(<OrganizerUnavailable />);
  expect(html).toContain('href="/organizer"');
  expect(html).toContain("Try again");
  expect(html).not.toContain("Sign in");
});
