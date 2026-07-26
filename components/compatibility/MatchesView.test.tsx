import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchesView } from "./MatchesView";
import { content } from "@/content";
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

function pair(id: string, name: string, score = 0.1544): PairSummary {
  return {
    pair_id: id,
    headline: `Ana and ${name} both lead with Benevolence.`,
    score,
    band: "A real mix.",
    shared_values: [VALUE],
    difference: "Where you differ most is humour.",
    people: [PERSON, { ...PERSON, name }],
  };
}

const escaped = (s: string) => s.replace(/'/g, "&#x27;");

test("one match reads as one, not as '1 matches'", () => {
  const html = renderToStaticMarkup(<MatchesView pairs={[pair("p1", "Ben")]} />);
  expect(html).toContain(escaped(content.compatibilityTest.matches.countOne));
  expect(html).not.toContain("{count}");
});

test("several matches are counted in the heading", () => {
  const html = renderToStaticMarkup(
    <MatchesView pairs={[pair("p1", "Ben"), pair("p2", "Cal"), pair("p3", "Di")]} />,
  );
  expect(html).toContain("3 people have answered your link.");
  expect(html).not.toContain("{count}");
});

test("every pair gets its own card", () => {
  const html = renderToStaticMarkup(
    <MatchesView pairs={[pair("p1", "Ben"), pair("p2", "Cal")]} />,
  );
  expect(html.match(/class="ctest-match"/g)).toHaveLength(2);
  expect(html).toContain('href="/compatibility-test/pair/p1"');
  expect(html).toContain('href="/compatibility-test/pair/p2"');
});

test("the backend's newest-first order is preserved", () => {
  // The page does not re-sort; if this ever fails, something started to.
  // Scores deliberately disagree with backend order (p2's is lower than
  // p1's) so that a plausible "best match first" sort would reorder them --
  // a tie, as with a fixed score across fixtures, would pass under a stable
  // sort even if a re-sort were introduced, and prove nothing.
  const html = renderToStaticMarkup(
    <MatchesView pairs={[pair("p2", "Cal", 0.1), pair("p1", "Ben", 0.9)]} />,
  );
  expect(html.indexOf("pair/p2")).toBeLessThan(html.indexOf("pair/p1"));
});

test("the heading is the page's only h1", () => {
  const html = renderToStaticMarkup(<MatchesView pairs={[pair("p1", "Ben")]} />);
  expect(html.match(/<h1/g)).toHaveLength(1);
});
