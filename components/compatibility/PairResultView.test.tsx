import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PairResultView } from "./PairResultView";
import { content } from "@/content";
import type { PairResult } from "@/lib/weftTypes";

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "care up close",
  blurb: "You look after the people in front of you.",
};

const RESULT: PairResult = {
  headline: "Ana and Ben both lead with Benevolence.",
  band: "A real mix — some deep overlap, some genuine difference.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [
    {
      name: "Ana",
      top_values: [VALUE],
      humour: "warm/affiliative",
      opens_up: "opens up quickly",
      pace: "likes a steady rhythm",
      life_stage: "rooting",
    },
    {
      name: "Ben",
      top_values: [VALUE],
      humour: "—",
      opens_up: "opens up slowly",
      pace: "likes space between",
      life_stage: "unspecified",
    },
  ],
};

test("the result leads with the headline and the band", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain(RESULT.headline);
  expect(html).toContain(RESULT.band);
  expect(html).toContain(RESULT.difference);
  expect(html).toContain("ctest-shell");
});

test("both people appear, named, with their values", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain("Ana");
  expect(html).toContain("Ben");
  expect(html).toContain(VALUE.tagline);
  expect(html).toContain(VALUE.blurb);
});

test("a trait the backend could not measure is not printed", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  // Ben has no humour reading and no life stage.
  expect(html).not.toContain("unspecified");
  expect(html).toContain(content.compatibilityTest.pair.traits.opensUp);
});

test("two people with nothing in common still get a sentence", () => {
  const html = renderToStaticMarkup(
    <PairResultView result={{ ...RESULT, shared_values: [] }} shareToken={null} />,
  );
  expect(html).toContain(
    content.compatibilityTest.pair.noShared.replace(/'/g, "&#x27;"),
  );
});

test("a responder is offered a link of their own", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  expect(html).toContain(content.compatibilityTest.pair.shareHeadline);
  expect(html).toContain("/compatibility-test/invite/tok-9");
});

test("without a token the page offers the quiz instead of a dead link", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).not.toContain("/compatibility-test/invite/");
  expect(html).toContain(
    `aria-label="${content.compatibilityTest.pair.restart}"`,
  );
});

test("the result never leaks a score", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  // The backend sends words, not numbers; nothing here should invent one.
  expect(html).not.toContain("ctest-meter");
});
