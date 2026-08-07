import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReturnLink } from "./ReturnLink";
import { demoB2cContent } from "@/features/demo-b2c/content";

const copy = demoB2cContent.share;

test("it prints the return URL and offers to copy it", () => {
  const html = renderToStaticMarkup(<ReturnLink token="in-1" />);
  expect(html).toContain("/match/thread/in-1");
  expect(html).toContain(copy.returnCopy);
  expect(html).toContain(copy.returnLink);
});

test("it never renders the return URL as somewhere to go", () => {
  // Navigating away from the share screen destroys the invite token it holds.
  const html = renderToStaticMarkup(<ReturnLink token="in-1" />);
  expect(html).not.toContain("<a ");
  expect(html).not.toContain('href="/match/thread/in-1"');
});

test("it explains what the link is for", () => {
  const html = renderToStaticMarkup(<ReturnLink token="in-1" />);
  expect(html).toContain(copy.returnHint.replace(/'/g, "&#x27;"));
});

test("it announces the copy politely", () => {
  const html = renderToStaticMarkup(<ReturnLink token="in-1" />);
  expect(html).toContain('aria-live="polite"');
});

test("it encodes a token that would otherwise change the path", () => {
  const html = renderToStaticMarkup(<ReturnLink token="a/b" />);
  expect(html).toContain("/match/thread/a%2Fb");
});

test("it stays quieter than the invite card it sits under", () => {
  // Both links are secrets; only one is meant to be handed to another person.
  // A sender who copies the wrong one gives away their result page forever.
  const html = renderToStaticMarkup(<ReturnLink token="in-1" />);
  expect(html).toContain("ctest-returnlink");
  expect(html).not.toContain("ctest-linkcard");
  expect(html).not.toContain("premium-cta");
});
