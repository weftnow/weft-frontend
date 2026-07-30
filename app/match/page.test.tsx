import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Page, { metadata } from "./page";

test("match page renders the quiz shell", async () => {
  // No WEFT_API_URL in the test environment, so this exercises the fallback
  // path: the quiz must still render when the backend cannot be reached.
  const html = renderToStaticMarkup(await Page());
  expect(html).toContain("ctest-shell");
});

test("match page sets its own metadata title", () => {
  expect(String(metadata.title)).toContain("Compatibility");
});
