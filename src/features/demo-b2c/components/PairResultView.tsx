import Link from "next/link";
import { CtestShell } from "@/features/demo-b2c/components/CtestShell";
import { ConnectionSummary } from "@/features/demo-b2c/components/pair/ConnectionSummary";
import { EvaluationPanel } from "@/features/demo-b2c/components/pair/EvaluationPanel";
import { ScoreHero } from "@/features/demo-b2c/components/pair/ScoreHero";
import { ShareClose } from "@/features/demo-b2c/components/pair/ShareClose";
import { demoB2cContent } from "@/features/demo-b2c/content";
import type { PairResult } from "@/features/demo-b2c/types/contracts";

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
  const copy = demoB2cContent.pair;

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
