import { demoB2cContent } from "@/features/demo-b2c/content";
import { CtestShell } from "@/features/demo-b2c/components/CtestShell";
import { MatchCard } from "@/features/demo-b2c/components/MatchCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { PairSummary } from "@/features/demo-b2c/types/contracts";

/**
 * Everyone who has answered this person's link, newest first — the order the
 * backend sent them in, deliberately not re-sorted here.
 *
 * Callers guarantee at least one pair. Nobody-yet is a different screen with
 * a different job (offering a fresh link), not an empty version of this one.
 */
export function MatchesView({ pairs }: { pairs: PairSummary[] }) {
  const copy = demoB2cContent.matches;
  const count =
    pairs.length === 1
      ? copy.countOne
      : copy.countMany.replace("{count}", String(pairs.length));

  return (
    <CtestShell align="top">
      <div className="ctest-pair relative z-10">
        <header className="flex flex-col items-center text-center">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1 className="ctest-band">{copy.headline}</h1>
          <p className="ctest-note">{count}</p>
        </header>

        <ul className="ctest-matches">
          {pairs.map((pair, index) => (
            <MatchCard index={index} key={pair.pair_id} pair={pair} />
          ))}
        </ul>
      </div>
    </CtestShell>
  );
}
