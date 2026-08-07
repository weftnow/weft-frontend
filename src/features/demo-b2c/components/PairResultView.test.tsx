import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PairResultView } from "./PairResultView";
import { demoB2cContent } from "@/features/demo-b2c/content";
import type { PairResult } from "@/features/demo-b2c/types/contracts";

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "care up close",
  blurb: "You look after the people in front of you.",
};

const RESULT: PairResult = {
  headline: "Ana and Ben both lead with Benevolence.",
  // 0.1544 is a real "a real mix" score from weft_core, and maps to 52.
  score: 0.1544,
  percent: 52,
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
  expect(html).toContain(demoB2cContent.pair.heading.replace(/'/g, "&#x27;"));
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
  expect(html).toContain(demoB2cContent.pair.traits.opensUp);
});

test("two people with nothing in common still get a sentence", () => {
  const html = renderToStaticMarkup(
    <PairResultView result={{ ...RESULT, shared_values: [] }} shareToken={null} />,
  );
  expect(html).toContain(
    demoB2cContent.pair.noShared.replace(/'/g, "&#x27;"),
  );
});

test("a responder is offered a link of their own", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  expect(html).toContain(demoB2cContent.pair.shareHeadline);
  expect(html).toContain("/compatibility-test/invite/tok-9");
});

test("without a token the page offers the quiz instead of a dead link", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).not.toContain("/compatibility-test/invite/");
  expect(html).toContain(
    `aria-label="${demoB2cContent.pair.restart}"`,
  );
});

test("the result shows the fit score and fills the gauge to match", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  // The figure is rendered, not animated to, so it is true in the very first
  // paint and for anyone without JavaScript.
  expect(html).toContain(">52<");
  expect(html).toContain("Fit score 52 out of 100");
  expect(html).toContain("--score:52");
});

test("the percentage never contradicts the band beside it", () => {
  // Both come off the same backend payload, and the backend puts each band
  // boundary on a round twenty -- so "strikingly aligned" can never render
  // at 44.
  const aligned = renderToStaticMarkup(
    <PairResultView
      result={{ ...RESULT, score: 0.9137, percent: 96, band: "You two are strikingly aligned." }}
      shareToken={null}
    />,
  );
  expect(aligned).toContain("Fit score 96 out of 100");
  expect(aligned).toContain("You two are strikingly aligned.");
});

test("a pair who scored below zero still gets a meter, not a broken one", () => {
  // The backend's scale runs to -1. A negative width would paint nothing and
  // read as a rendering failure rather than a real result.
  const html = renderToStaticMarkup(
    <PairResultView result={{ ...RESULT, score: -0.6, percent: 10 }} shareToken={null} />,
  );
  expect(html).toContain("--score:10");
  expect(html).not.toContain("--score:-");
});

test("the result still never leaks the signal behind the score", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  // The pair's own number is theirs. The channel breakdown that produced it,
  // and the raw -1..1 score itself, are not for the page.
  for (const leak of ["breakdown", "vuln", "tempo", "schwartz", "0.1544"]) {
    expect(html).not.toContain(leak);
  }
});

test("a result links onward to every other thread this person has", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  expect(html).toContain('href="/compatibility-test/matches"');
  expect(html).toContain(demoB2cContent.pair.matchesLink);
});

test("the matches link is there even for someone arriving on a forwarded link", () => {
  // It costs nothing: with no session cookie the page invites them to take it.
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain('href="/compatibility-test/matches"');
});

test("a dimension neither person measured leaves no row behind", () => {
  // Ana keeps humour; make both humourless and the row must vanish.
  const [ana, ben] = RESULT.people;
  const html = renderToStaticMarkup(
    <PairResultView
      result={{ ...RESULT, people: [{ ...ana, humour: "—" }, ben] }}
      shareToken={null}
    />,
  );
  expect(html).not.toContain(demoB2cContent.pair.traits.humour);
  expect(html).toContain(demoB2cContent.pair.traits.opensUp);
});

test("a dimension one person measured shows their reading beside a dash", () => {
  // Ben's humour is "—": the row stays for Ana's sake.
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain(demoB2cContent.pair.traits.humour);
  expect(html).toContain("warm/affiliative");
  expect(html).toContain("ctest-result-trait-blank");
});

test("a value both people hold is marked shared", () => {
  // Both lead with Benevolence in the fixture.
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain(demoB2cContent.pair.sharedTag);
});

test("the reference result hierarchy uses only supported profile data", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  expect(html).toContain(demoB2cContent.pair.backToMatches);
  expect(html).toContain("ctest-result-score");
  expect(html).toContain("ctest-result-summary");
  expect(html).toContain("ctest-result-evaluation");
  expect(html).not.toContain("Match breakdown");
  expect(html).not.toContain("Start a conversation");
  expect(html).not.toContain("Share match");
});

test("the result does not invent unsupported participant metadata", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  for (const unsupported of [
    "Marketing Lead",
    "Product Designer",
    "New York",
    "Seoul",
    "Matched across",
    "<img",
  ]) {
    expect(html).not.toContain(unsupported);
  }
});

test("the two names frame a circular score with an accessible verdict", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain("ctest-result-person--left");
  expect(html).toContain("ctest-result-person--right");
  expect(html).toContain("Ana");
  expect(html).toContain("Ben");
  expect(html).toContain("Fit score 52 out of 100");
  expect(html).toContain("--score:52");
  expect(html).toContain(RESULT.band);
});

test("the summary separates shared values from measured differences", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain(demoB2cContent.pair.matchLabel);
  expect(html).toContain(demoB2cContent.pair.matchSub);
  expect(html).toContain(demoB2cContent.pair.differenceSub);
  expect(html).toContain(VALUE.name);
  expect(html).toContain(VALUE.blurb);
  expect(html).toContain(RESULT.difference);
  expect(html).toContain(demoB2cContent.pair.traits.pace);
});

test("evaluation lists only dimensions represented by the result", () => {
  const [ana, ben] = RESULT.people;
  const html = renderToStaticMarkup(
    <PairResultView
      result={{
        ...RESULT,
        people: [
          { ...ana, humour: "—", life_stage: "unspecified" },
          { ...ben, humour: "—", life_stage: "unspecified" },
        ],
      }}
      shareToken={null}
    />,
  );
  expect(html).toContain(demoB2cContent.pair.evaluationHeading);
  expect(html).toContain(demoB2cContent.pair.evaluationValues);
  expect(html).not.toContain(demoB2cContent.pair.evaluationTraits.humour);
  expect(html).not.toContain(demoB2cContent.pair.evaluationTraits.lifeStage);
});

test("the closing panel shares the test rather than the match", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  expect(html).toContain("ctest-result-share");
  expect(html).toContain(demoB2cContent.pair.shareHeadline);
  expect(html).toContain("/compatibility-test/invite/tok-9");
  expect(html).not.toContain("Share match");
  expect(html).not.toContain("Start a conversation");
});

test("each measured dimension has its own semantic icon", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);

  for (const icon of ["values", "humour", "opens-up", "pace", "life-stage"]) {
    expect(html).toContain(`data-result-icon="${icon}"`);
  }
  expect(html).not.toContain(">↕<");
});

test("both summary lists start before the difference callout", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  const traits = html.indexOf("ctest-result-traits");
  const callout = html.indexOf('class="ctest-result-difference"');

  expect(traits).toBeGreaterThan(-1);
  expect(callout).toBeGreaterThan(traits);
});
