import type { CSSProperties } from "react";
import { content } from "@/content";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ThreadCross } from "./ThreadCross";
import type { PairResult } from "@/lib/weftTypes";

/** The names and verdict, kept free of profile details the result does not own. */
export function ScoreHero({ result }: { result: PairResult }) {
  const copy = content.compatibilityTest.pair;
  const [left, right] = result.people;

  return (
    <header className="ctest-result-hero">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <h1 className="ctest-result-heading">{copy.heading}</h1>
      <div className="ctest-result-people">
        <h2 className="ctest-result-person ctest-result-person--left">{left?.name}</h2>
        <span aria-hidden className="ctest-result-thread">
          <ThreadCross />
        </span>
        <h2 className="ctest-result-person ctest-result-person--right">{right?.name}</h2>
      </div>
      <div
        className="ctest-result-score"
        role="img"
        aria-label={`${copy.scoreLabel} ${copy.scoreOutOf.replace("{percent}", String(result.percent))}. ${result.band}`}
        style={{ "--score": result.percent } as CSSProperties}
      >
        <span className="ctest-result-score-number" aria-hidden>
          {result.percent}<span>%</span>
        </span>
        <span className="ctest-result-score-band" aria-hidden>{result.band}</span>
      </div>
      <p className="ctest-result-headline">{result.headline}</p>
      <p className="ctest-note">{copy.scoreNote}</p>
    </header>
  );
}
