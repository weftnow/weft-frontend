import Link from "next/link";
import { content } from "@/content";
import { pairHref } from "@/lib/links";
import type { PairSummary } from "@/lib/weftTypes";

/**
 * One match, at a glance. Not a shrunken pair result: the headline, the band
 * and the number, and a link to the page that carries the profiles.
 *
 * No share token rides along in the href. The token belongs to whoever just
 * finished; someone reviewing their own matches is not handing out a
 * capability, and putting one in their history only risks leaking it.
 */
export function MatchCard({ pair, index }: { pair: PairSummary; index: number }) {
  const copy = content.compatibilityTest.matches;
  const percent = pair.percent;

  return (
    <li className="ctest-match">
      <Link className="ctest-match-link" href={pairHref(pair.pair_id)}>
        <span aria-hidden className="ctest-match-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="ctest-match-headline">{pair.headline}</p>
        <p className="ctest-match-band">{pair.band}</p>

        <div className="ctest-match-meter">
          <span className="ctest-match-percent" aria-hidden>
            {percent}
            <span className="ctest-match-unit">{content.compatibilityTest.pair.scoreUnit}</span>
          </span>
          <span
            className="ctest-gauge-track"
            role="img"
            aria-label={`${content.compatibilityTest.pair.scoreLabel} ${content.compatibilityTest.pair.scoreOutOf.replace("{percent}", String(percent))}`}
          >
            <span className="ctest-gauge-fill" style={{ width: `${percent}%` }} />
          </span>
        </div>

        {/* The arrow is CSS (::after), not copy: decoration has no business
            being a string a translator would be handed. */}
        <span className="ctest-match-open">{copy.open}</span>
      </Link>
    </li>
  );
}
