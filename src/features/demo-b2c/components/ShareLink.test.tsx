import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareLink } from "./ShareLink";
import { demoB2cContent } from "@/features/demo-b2c/content";

test("share link renders the invite path and a copy button", () => {
  const html = renderToStaticMarkup(<ShareLink token="tok-1" />);
  expect(html).toContain("/match/invite/tok-1");
  expect(html).toContain(`aria-label="${demoB2cContent.share.copy}"`);
});

test("share link encodes a token that would otherwise change the path", () => {
  const html = renderToStaticMarkup(<ShareLink token="a/b" />);
  expect(html).toContain("/match/invite/a%2Fb");
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

test("the link sits in a labelled card with the copy action attached", () => {
  const html = renderToStaticMarkup(<ShareLink token="tok-1" />);
  expect(html).toContain("ctest-linkcard");
  expect(html).toContain(demoB2cContent.share.linkLabel);
  expect(html).not.toContain("ctest-linkbox");
});
