import { content } from "@/content";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { PairResult } from "@/lib/weftTypes";

/** The verdict: eyebrow, the number, the gauge it stands on, the sentence. */
export function ScoreHero({ result }: { result: PairResult }) {
  const copy = content.compatibilityTest.pair;
  const percent = result.percent;

  return (
    <header className="flex flex-col items-center text-center">
      <Eyebrow>{copy.eyebrow}</Eyebrow>

      {/* Deliberately not counted up. A rolling figure and the bar below it
          are two clocks, and when they drift the page shows a number that
          contradicts its own gauge. The bar animates; the number is just
          true, from the first paint and without JavaScript. */}
      <p className="ctest-score" aria-hidden>
        {percent}
        <span className="ctest-score-unit">{copy.scoreUnit}</span>
      </p>

      <div
        className="ctest-gauge"
        role="img"
        aria-label={`${copy.scoreLabel} ${copy.scoreOutOf.replace("{percent}", String(percent))}. ${result.band}`}
      >
        <div className="ctest-gauge-track">
          <span className="ctest-gauge-fill" style={{ width: `${percent}%` }} />
          <span className="ctest-gauge-ticks" aria-hidden>
            {/* One cell per band, so the bar is divided the way the
                sentence below divides the range. */}
            {[0, 1, 2, 3, 4].map((band) => (
              <span key={band} />
            ))}
          </span>
        </div>
        <p className="ctest-gauge-scale" aria-hidden>
          <span>{copy.scaleLow}</span>
          <span>{copy.scaleHigh}</span>
        </p>
      </div>

      <h1 className="ctest-band">{result.band}</h1>
      <p className="ctest-note">{copy.scoreNote}</p>
    </header>
  );
}
