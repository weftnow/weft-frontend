import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReshareLink } from "./ReshareLink";
import { content } from "@/content";

test("it offers the button and no link until one is asked for", () => {
  const html = renderToStaticMarkup(<ReshareLink />);
  expect(html).toContain(`aria-label="${content.compatibilityTest.matches.waiting.cta}"`);
  // No token exists yet, so no link box and no invite path may appear.
  expect(html).not.toContain("ctest-linkbox");
  expect(html).not.toContain("/compatibility-test/invite/");
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

test("no error is shown before anything has been tried", () => {
  const html = renderToStaticMarkup(<ReshareLink />);
  expect(html).not.toContain(content.compatibilityTest.matches.waiting.failed);
  expect(html).not.toContain('role="alert"');
});
