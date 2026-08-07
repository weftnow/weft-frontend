import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareScreen } from "./ShareScreen";
import { demoB2cContent } from "@/features/demo-b2c/content";

test("share screen leads with the link and why it needs sending", () => {
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-1" onRestart={() => {}} />);
  expect(html).toContain(demoB2cContent.share.headline);
  // renderToStaticMarkup HTML-escapes apostrophes in text nodes, so the raw
  // copy string (with a literal ') never appears verbatim in the markup.
  expect(html).toContain(demoB2cContent.share.note.replace(/'/g, "&#x27;"));
  expect(html).toContain("/compatibility-test/invite/tok-1");
});

test("the share screen points back to the matches page", () => {
  // The screen promises they can come back. This is where back is.
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-9" onRestart={() => {}} />);
  expect(html).toContain('href="/compatibility-test/matches"');
  expect(html).toContain(
    demoB2cContent.share.matchesLink.replace(/'/g, "&#x27;"),
  );
});

test("the share screen shows no score, because there is nothing to score yet", () => {
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-9" onRestart={() => {}} />);
  // One person is not a compatibility. Nothing numeric belongs here.
  expect(html).not.toContain("ctest-gauge");
  expect(html).not.toMatch(/\d+%/);
  expect(html).not.toContain("archetype");
});
