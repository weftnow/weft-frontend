import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareScreen } from "./ShareScreen";
import { demoB2cContent } from "@/features/demo-b2c/content";

test("share screen leads with the link and why it needs sending", () => {
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="tok-1" returnToken={null} onRestart={() => {}} />,
  );
  expect(html).toContain(demoB2cContent.share.headline);
  // renderToStaticMarkup HTML-escapes apostrophes in text nodes, so the raw
  // copy string (with a literal ') never appears verbatim in the markup.
  expect(html).toContain(demoB2cContent.share.note.replace(/'/g, "&#x27;"));
  expect(html).toContain("/match/invite/tok-1");
});

test("the share screen points back to the matches page", () => {
  // The invite link is not how they get back -- this is where back is.
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="tok-9" returnToken={null} onRestart={() => {}} />,
  );
  expect(html).toContain('href="/match/matches"');
  expect(html).toContain(
    demoB2cContent.share.matchesLink.replace(/'/g, "&#x27;"),
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
  // The return link comes with an explanation, not just a bare URL.
  expect(html).toContain(demoB2cContent.share.returnHint.replace(/'/g, "&#x27;"));
});

test("the return link is saved by copying it, never by navigating to it", () => {
  // The share phase is client state. Following the return link unmounts the
  // only place the invite token exists, and nothing lists a session's invite
  // tokens -- so a link the sender must tap to read is a link that costs them
  // the one they were told to send. The URL is on screen and copyable instead.
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="out-1" returnToken="in-1" onRestart={() => {}} />,
  );
  expect(html).toContain(">/match/thread/in-1<");
  expect(html).not.toContain('href="/match/thread/in-1"');
  expect(html).not.toContain("/match/thread/in-1</a>");
  expect(html).toContain(demoB2cContent.share.returnCopy);
});

test("no return link is offered when there is no token", () => {
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="out-1" returnToken={null} onRestart={() => {}} />,
  );
  expect(html).not.toContain("/match/thread/");
});

test("the share copy no longer claims the invite is how you come back", () => {
  expect(demoB2cContent.share.note).not.toContain("come back");
});
