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
  // 0.1544 is a real "a real mix" score from weft_core, and maps to 44%.
  score: 0.1544,
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

test("the result shows the compatibility percentage and fills the gauge to match", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  // The figure is rendered, not animated to, so it is true in the very first
  // paint and for anyone without JavaScript.
  expect(html).toContain(">44<");
  expect(html).toContain("Compatibility 44 out of 100");
  expect(html).toContain("width:44%");
});

test("the percentage never contradicts the band beside it", () => {
  // Both come off the same score, and scorePercent puts each band boundary on
  // a round twenty -- so "strikingly aligned" can never render at 44%.
  const aligned = renderToStaticMarkup(
    <PairResultView
      result={{ ...RESULT, score: 0.9137, band: "You two are strikingly aligned." }}
      shareToken={null}
    />,
  );
  expect(aligned).toContain("Compatibility 96 out of 100");
  expect(aligned).toContain("You two are strikingly aligned.");
});

test("a pair who scored below zero still gets a meter, not a broken one", () => {
  // The backend's scale runs to -1. A negative width would paint nothing and
  // read as a rendering failure rather than a real result.
  const html = renderToStaticMarkup(
    <PairResultView result={{ ...RESULT, score: -0.6 }} shareToken={null} />,
  );
  expect(html).toContain("width:9%");
  expect(html).not.toContain("width:-");
});

test("the result still never leaks the signal behind the score", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  // The pair's own number is theirs. The channel breakdown that produced it,
  // and the raw -1..1 score itself, are not for the page.
  for (const leak of ["breakdown", "vuln", "tempo", "schwartz", "0.1544"]) {
    expect(html).not.toContain(leak);
  }
});
