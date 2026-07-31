import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { escapeApostrophes } from "@/lib/testEscape";
import Page, { ThreadScreen, metadata } from "./page";
import { content } from "@/content";
import { pairHref } from "@/lib/links";

const VALUE = { key: "BE", name: "Benevolence", tagline: "t", blurb: "b" };
const PERSON = {
  name: "Ana", top_values: [VALUE], humour: "warm/affiliative",
  opens_up: "opens up quickly", pace: "steady", life_stage: "rooting",
};
const SUMMARY = {
  pair_id: "p1", headline: "Ana and Ben.", score: 0.5, percent: 52, band: "A mix.",
  shared_values: [VALUE], difference: "humour",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

test("a saved return link is never indexed", () => {
  // This URL is the one bearer secret with no expiry at all: it is meant to be
  // kept for as long as the sender wants their result. A crawler holding one
  // would publish both people's profiles.
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("a thread nobody has answered says so and does not apologise", () => {
  const html = renderToStaticMarkup(<ThreadScreen outcome={{ status: "ok", pairs: [] }} />);
  expect(html).toContain(content.compatibilityTest.thread.waiting.headline);
  // The list heading belongs to MatchesView, a different screen entirely.
  expect(html).not.toContain(escapeApostrophes(content.compatibilityTest.matches.headline));
});

test("an unknown token says the link is not recognised", () => {
  const html = renderToStaticMarkup(<ThreadScreen outcome={{ status: "not_found" }} />);
  expect(html).toContain(escapeApostrophes(content.compatibilityTest.thread.unknown.headline));
});

test("an outage offers a retry rather than a dead end", () => {
  const html = renderToStaticMarkup(<ThreadScreen outcome={{ status: "unavailable" }} />);
  expect(html).toContain(escapeApostrophes(content.compatibilityTest.thread.unavailable.headline));
});

test("several pairs render as a list", () => {
  const html = renderToStaticMarkup(
    <ThreadScreen outcome={{ status: "ok", pairs: [SUMMARY, { ...SUMMARY, pair_id: "p2" }] }} />,
  );
  expect(html).toContain("/match/pair/p1");
  expect(html).toContain("/match/pair/p2");
});

test("two pairs render as a list and redirect nowhere", async () => {
  // The `pairs.length === 1` guard is what keeps a sender who invited several
  // people from being dropped on the first result with the rest hidden. Only
  // `ThreadPage` can prove that: `ThreadScreen` never reaches `redirect()`, so
  // relaxing the guard to `>= 1` would pass every other test in this file.
  // Same global-`fetch` seam as the single-pair test below.
  const originalFetchUrl = process.env.WEFT_API_URL;
  const originalFetch = globalThis.fetch;
  process.env.WEFT_API_URL = "https://api.example.test";
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ pairs: [SUMMARY, { ...SUMMARY, pair_id: "p2" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;

  try {
    // Returning at all is half the assertion: redirect() throws.
    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ token: "sender-token" }) }),
    );
    expect(html).toContain("/match/pair/p1");
    expect(html).toContain("/match/pair/p2");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.WEFT_API_URL = originalFetchUrl;
  }
});

test("exactly one pair redirects to its own result page instead of rendering inline", async () => {
  // This is the ordinary journey -- one friend answering one invite produces
  // exactly one pair -- so it deserves a committed test more than the rarer
  // states above, not less. `ThreadScreen` can never exercise it: `redirect()`
  // lives only in the async default export, which needs `loadThread` to
  // resolve a real "ok" outcome. `ThreadPage` calls `loadThread(token)` with
  // no injectable fetch, so the network call it makes through `weftFetch` is
  // stubbed at the global `fetch` -- the same seam `lib/server/thread.test.ts`
  // uses via its `stub()` helper, just applied globally instead of passed as
  // an argument, because this call site has no parameter to pass it through.
  const originalFetchUrl = process.env.WEFT_API_URL;
  const originalFetch = globalThis.fetch;
  process.env.WEFT_API_URL = "https://api.example.test";
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ pairs: [SUMMARY] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;

  try {
    await Page({ params: Promise.resolve({ token: "sender-token" }) });
    throw new Error("expected redirect() to throw NEXT_REDIRECT");
  } catch (err) {
    // redirect() communicates its destination as a thrown error whose
    // `.digest` encodes "NEXT_REDIRECT;<type>;<url>;<status>;". Asserted in
    // full, not just "something was thrown": a redirect to the wrong URL is
    // the failure mode most likely to actually happen here.
    expect((err as { digest?: string }).digest).toBe(
      `NEXT_REDIRECT;replace;${pairHref(SUMMARY.pair_id)};307;`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.WEFT_API_URL = originalFetchUrl;
  }
});
