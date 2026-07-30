import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { escapeApostrophes } from "@/lib/testEscape";
import { ThreadScreen } from "./page";
import { content } from "@/content";

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

test("a thread nobody has answered says so and does not apologise", () => {
  const html = renderToStaticMarkup(<ThreadScreen outcome={{ status: "ok", pairs: [] }} />);
  expect(html).toContain(content.compatibilityTest.thread.waiting.headline);
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
