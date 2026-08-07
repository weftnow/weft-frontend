import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MintedLinks, ReshareLink } from "./ReshareLink";
import { demoB2cContent } from "@/features/demo-b2c/content";

test("it offers the button and no link until one is asked for", () => {
  const html = renderToStaticMarkup(<ReshareLink />);
  expect(html).toContain(`aria-label="${demoB2cContent.matches.waiting.cta}"`);
  // No token exists yet, so no link box and no invite path may appear.
  expect(html).not.toContain("ctest-linkbox");
  expect(html).not.toContain("/match/invite/");
});

test("nothing is minted just by rendering the page", async () => {
  // A GET that spends a token on every refresh is a slow leak. The token is
  // minted by the click, and only by the click.
  let called = false;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;

  try {
    renderToStaticMarkup(<ReshareLink />);
    // Give any stray effect or microtask a turn to run before asserting.
    await Promise.resolve();
    expect(called).toBe(false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a fresh mint offers the invite to send and the sender's own way back", () => {
  // "Invite someone else" mints a second invite, and the pairs it produces
  // belong to a second return token. Without this, that token is minted,
  // persisted, and handed to nobody -- and those pairs vanish with the cookie.
  const html = renderToStaticMarkup(<MintedLinks token="tok-9" returnToken="ret-9" />);
  expect(html).toContain("/match/invite/tok-9");
  expect(html).toContain("/match/thread/ret-9");
  expect(html).toContain(demoB2cContent.share.returnCopy);
  // The invite stays the obvious action: it is first, and it keeps the card.
  expect(html.indexOf("/match/invite/tok-9")).toBeLessThan(html.indexOf("/match/thread/ret-9"));
  expect(html).toContain("ctest-linkcard");
});

test("the return link on a fresh mint is copied, not followed", () => {
  const html = renderToStaticMarkup(<MintedLinks token="tok-9" returnToken="ret-9" />);
  expect(html).not.toContain('href="/match/thread/ret-9"');
});

test("no error is shown before anything has been tried", () => {
  const html = renderToStaticMarkup(<ReshareLink />);
  expect(html).not.toContain(demoB2cContent.matches.waiting.failed);
  expect(html).not.toContain('role="alert"');
});
