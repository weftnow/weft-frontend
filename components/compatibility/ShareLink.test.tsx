import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareLink } from "./ShareLink";
import { content } from "@/content";

test("share link renders the invite path and a copy button", () => {
  const html = renderToStaticMarkup(<ShareLink token="tok-1" />);
  expect(html).toContain("/compatibility-test/invite/tok-1");
  expect(html).toContain(`aria-label="${content.compatibilityTest.share.copy}"`);
});

test("share link encodes a token that would otherwise change the path", () => {
  const html = renderToStaticMarkup(<ShareLink token="a/b" />);
  expect(html).toContain("/compatibility-test/invite/a%2Fb");
});

test("share link places a neighbour beside the copy button when given one", () => {
  const html = renderToStaticMarkup(
    <ShareLink token="tok-1" secondary={<button type="button">Start over</button>} />,
  );
  expect(html).toContain("Start over");
});

test("share link announces the copy politely", () => {
  const html = renderToStaticMarkup(<ShareLink token="tok-1" />);
  expect(html).toContain('aria-live="polite"');
});
