import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { escapeApostrophes } from "@/features/demo-b2c/test/escape";
import { MatchesScreen, metadata } from "./page";
import { demoB2cContent } from "@/features/demo-b2c/content";
import type { PairSummary } from "@/features/demo-b2c/types/contracts";

const copy = demoB2cContent.matches;

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "Looking after your people",
  blurb: "You show up for the people close to you.",
};

const PERSON = {
  name: "Ana",
  top_values: [VALUE],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

const PAIR: PairSummary = {
  pair_id: "pair-1",
  headline: "Ana and Ben both lead with Benevolence.",
  score: 0.1544,
  percent: 52,
  band: "A real mix.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

test("this page must never be indexed", () => {
  // It renders whatever the cookie holder's matches are.
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("someone who has never taken it is invited to", () => {
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "no_session" }} />);
  expect(html).toContain(escapeApostrophes(copy.none.headline));
  expect(html).toContain(`aria-label="${copy.none.cta}"`);
  expect(html).toContain('href="/match"');
});

test("a cookie whose session is gone says so, and offers a restart", () => {
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "not_found" }} />);
  expect(html).toContain(escapeApostrophes(copy.lost.headline));
  expect(html).toContain(`aria-label="${copy.lost.cta}"`);
});

test("an unreachable backend offers a retry, not a restart", () => {
  // Their thread is fine. Sending them back to question one would be a lie.
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "unavailable" }} />);
  expect(html).toContain(escapeApostrophes(copy.unavailable.headline));
  expect(html).toContain(`aria-label="${copy.unavailable.cta}"`);
  expect(html).toContain('href="/match/matches"');
});

test("every dead end offers a way out", () => {
  for (const outcome of [
    { status: "no_session" },
    { status: "not_found" },
    { status: "unavailable" },
  ] as const) {
    const html = renderToStaticMarkup(<MatchesScreen outcome={outcome} />);
    expect(html).toContain("aria-label=");
  }
});

test("nobody has answered yet gets the waiting screen and a mint button", () => {
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "ok", pairs: [] }} />);
  expect(html).toContain(escapeApostrophes(copy.waiting.headline));
  expect(html).toContain(`aria-label="${copy.waiting.cta}"`);
  // The list heading belongs to the other screen entirely.
  expect(html).not.toContain(escapeApostrophes(copy.headline));
});

test("at least one match renders the list instead", () => {
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "ok", pairs: [PAIR] }} />);
  expect(html).toContain(escapeApostrophes(copy.headline));
  expect(html).toContain('href="/match/pair/pair-1"');
  expect(html).not.toContain(escapeApostrophes(copy.waiting.headline));
});
