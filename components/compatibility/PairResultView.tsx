import Link from "next/link";
import { CtestShell } from "@/components/compatibility/CtestShell";
import { ConnectionSummary } from "@/components/compatibility/pair/ConnectionSummary";
import { EvaluationPanel } from "@/components/compatibility/pair/EvaluationPanel";
import { ScoreHero } from "@/components/compatibility/pair/ScoreHero";
import { ShareClose } from "@/components/compatibility/pair/ShareClose";
import { content } from "@/content";
import type { PairResult } from "@/lib/weftTypes";

/**
 * The compatibility result for both people at once. The payload has no reader
 * identity, so both people remain named and neither is rewritten as "you".
 */
export function PairResultView({
  result,
  shareToken,
}: {
  result: PairResult;
  shareToken: string | null;
}) {
  const copy = content.compatibilityTest.pair;

  return (
    <CtestShell align="top">
      <div className="ctest-pair relative z-10">
        <Link className="ctest-result-back" href="/match/matches">
          <span aria-hidden>&larr;</span> {copy.backToMatches}
        </Link>
        <ScoreHero result={result} />
        <ConnectionSummary result={result} />
        <EvaluationPanel result={result} />
        <ShareClose shareToken={shareToken} />
      </div>
    </CtestShell>
  );
}
