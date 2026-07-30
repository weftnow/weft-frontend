import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareScreen } from "./ShareScreen";
import { content } from "@/content";

test("share screen leads with the link and why it needs sending", () => {
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="tok-1" returnToken={null} onRestart={() => {}} />,
  );
  expect(html).toContain(content.compatibilityTest.share.headline);
  // renderToStaticMarkup HTML-escapes apostrophes in text nodes, so the raw
  // copy string (with a literal ') never appears verbatim in the markup.
  expect(html).toContain(content.compatibilityTest.share.note.replace(/'/g, "&#x27;"));
  expect(html).toContain("/match/invite/tok-1");
});

test("the share screen points back to the matches page", () => {
  // The screen promises they can come back. This is where back is.
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="tok-9" returnToken={null} onRestart={() => {}} />,
  );
  expect(html).toContain('href="/match/matches"');
  expect(html).toContain(
    content.compatibilityTest.share.matchesLink.replace(/'/g, "&#x27;"),
  );
});

test("the share screen shows no score, because there is nothing to score yet", () => {
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="tok-9" returnToken={null} onRestart={() => {}} />,
  );
  // One person is not a compatibility. Nothing numeric belongs here.
  expect(html).not.toContain("ctest-gauge");
  expect(html).not.toMatch(/\d+%/);
  expect(html).not.toContain("archetype");
});

test("the sender is offered their own link, below the invite", () => {
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="out-1" returnToken="in-1" onRestart={() => {}} />,
  );
  expect(html).toContain("/match/thread/in-1");
  // The invite is still the primary action: it appears first.
  expect(html.indexOf("/match/invite/out-1")).toBeLessThan(html.indexOf("/match/thread/in-1"));
});

test("no return link is offered when there is no token", () => {
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="out-1" returnToken={null} onRestart={() => {}} />,
  );
  expect(html).not.toContain("/match/thread/");
});

test("the share copy no longer claims the invite is how you come back", () => {
  expect(content.compatibilityTest.share.note).not.toContain("come back");
});
