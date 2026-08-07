import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchCard } from "./MatchCard";
import type { PairSummary } from "@/lib/weftTypes";

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
  band: "A real mix — some deep overlap, some genuine difference.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

test("the card names both people and states the band", () => {
  const html = renderToStaticMarkup(<MatchCard index={0} pair={PAIR} />);
  // Nothing in the payload says which of the two is reading, so the card
  // names both rather than guessing at "you".
  expect(html).toContain("Ana and Ben both lead with Benevolence.");
  expect(html).toContain("A real mix");
});

test("the percentage matches the one the full result will show", () => {
  const html = renderToStaticMarkup(<MatchCard index={0} pair={PAIR} />);
  // Same backend percent as PairResultView, so the card and the page it
  // opens can never disagree.
  expect(html).toContain(">52<");
  expect(html).toContain("width:52%");
});

test("the card links to its own pair page", () => {
  const html = renderToStaticMarkup(<MatchCard index={0} pair={PAIR} />);
  expect(html).toContain('href="/compatibility-test/pair/pair-1"');
});

test("the link carries no share token", () => {
  // A returning originator is not handing out a capability, and a token in
  // their history is a token that can leak from it.
  const html = renderToStaticMarkup(<MatchCard index={0} pair={PAIR} />);
  expect(html).not.toContain("?share=");
});

test("a pair id is encoded rather than trusted as URL syntax", () => {
  const html = renderToStaticMarkup(
    <MatchCard index={0} pair={{ ...PAIR, pair_id: "a/b?c" }} />,
  );
  expect(html).toContain('href="/compatibility-test/pair/a%2Fb%3Fc"');
});

test("the card never leaks the raw score", () => {
  const html = renderToStaticMarkup(<MatchCard index={0} pair={PAIR} />);
  expect(html).not.toContain("0.1544");
});

test("a negative score still paints a bar", () => {
  const html = renderToStaticMarkup(
    <MatchCard index={0} pair={{ ...PAIR, score: -0.6, percent: 10 }} />,
  );
  expect(html).toContain("width:10%");
  expect(html).not.toContain("width:-");
});

test("each match wears its position as a mono index", () => {
  const html = renderToStaticMarkup(<MatchCard index={0} pair={PAIR} />);
  expect(html).toContain("ctest-match-index");
  expect(html).toContain(">01<");
});
