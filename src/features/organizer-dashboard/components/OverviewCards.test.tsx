import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OverviewCards } from "./OverviewCards";

const BASE = {
  plan: "free" as const,
  submitted: 64,
  checked_in: 61,
  groups: 16,
  seated: 61,
  confirmed: 58,
  feedback_responses: 34,
  average_rating: 4.6,
  rating_distribution: { "1": 0, "2": 1, "3": 3, "4": 10, "5": 20 },
  would_attend_again_pct: 92,
  comments: ["More time at the end"],
  suppressed: false,
};

describe("OverviewCards", () => {
  test("shows participation as a fraction, never a bare percentage", () => {
    const html = renderToStaticMarkup(<OverviewCards summary={BASE} />);
    expect(html).toContain("61");
    expect(html).toContain("64");
    expect(html).toContain("4.6");
    expect(html).toContain("More time at the end");
  });

  test("a suppressed event explains the silence instead of rendering nulls", () => {
    const html = renderToStaticMarkup(
      <OverviewCards
        summary={{
          ...BASE,
          feedback_responses: 3,
          average_rating: null,
          rating_distribution: {},
          would_attend_again_pct: null,
          suppressed: true,
        }}
      />,
    );
    expect(html).toContain("Not enough responses yet");
    expect(html).not.toContain("null");
  });
});
