import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeaveCanvas } from "./WeaveCanvas";

test("weave paths stay visually secondary to page content", () => {
  const html = renderToStaticMarkup(<WeaveCanvas />);

  expect(html).toContain('opacity="0.32"');
  expect(html).toContain('opacity="0.22"');
});
