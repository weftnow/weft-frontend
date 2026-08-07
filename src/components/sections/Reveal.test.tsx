import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Reveal } from "./Reveal";

test("reveal renders the matched portrait interaction and approved metrics", () => {
  const html = renderToStaticMarkup(<Reveal />);

  expect(html).toContain('aria-label="Show the matched attendee group"');
  expect(html).toContain("Placeholder portrait of a smiling event attendee");
  expect(html).toContain("Placeholder portrait of a matched event attendee");
  expect(html).toContain("Placeholder portrait of another matched attendee");
  expect(html).toContain("Matched group");
  expect(html).toContain("Placeholder metrics");
  expect(html.match(/min-w-0/g)?.length).toBe(2);
});
