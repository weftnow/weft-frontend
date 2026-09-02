import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Reveal } from "./Reveal";

test("reveal renders the matched portrait interaction without invented metrics", () => {
  const html = renderToStaticMarkup(<Reveal />);

  expect(html).toContain('aria-label="Show the matched attendee group"');
  expect(html).toContain("Portrait of a smiling attendee in a matched group");
  expect(html).toContain("Portrait of a laughing attendee in a matched group");
  expect(html).toContain("Portrait of an attendee wearing glasses in a matched group");
  expect(html).toContain("Matched group");
  expect(html.toLowerCase().includes("placeholder")).toBe(false);
  // The stats were invented and rendered as zeros before hydration.
  expect(html.includes("0%")).toBe(false);
  expect(html.includes("0.0x")).toBe(false);
  expect(html.includes("0.0/5")).toBe(false);
  expect(html.match(/min-w-0/g)?.length).toBe(2);
});
