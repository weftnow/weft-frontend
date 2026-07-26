import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareScreen } from "./ShareScreen";
import { content } from "@/content";

test("share screen leads with the link and why it needs sending", () => {
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-1" onRestart={() => {}} />);
  expect(html).toContain(content.compatibilityTest.share.headline);
  // renderToStaticMarkup HTML-escapes apostrophes in text nodes, so the raw
  // copy string (with a literal ') never appears verbatim in the markup.
  expect(html).toContain(content.compatibilityTest.share.note.replace(/'/g, "&#x27;"));
  expect(html).toContain("/compatibility-test/invite/tok-1");
});

test("share screen never claims a compatibility result for one person", () => {
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-1" onRestart={() => {}} />);
  expect(html).not.toContain("ctest-meter");
  expect(html).not.toContain("archetype");
});
