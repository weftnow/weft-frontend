import { CtestShell } from "@/components/compatibility/CtestShell";
import { DifferencePull } from "@/components/compatibility/pair/DifferencePull";
import { PeopleCompare } from "@/components/compatibility/pair/PeopleCompare";
import { ScoreHero } from "@/components/compatibility/pair/ScoreHero";
import { SharedValues } from "@/components/compatibility/pair/SharedValues";
import { ShareClose } from "@/components/compatibility/pair/ShareClose";
import type { PairResult } from "@/lib/weftTypes";

/**
 * The compatibility result, for both people at once.
 *
 * `result.people` is exactly two, in the backend's order -- the sender first,
 * the responder second -- but nothing in the payload identifies which of them
 * is reading it, and this link may have been forwarded. Both are named; nobody
 * is called "you".
 *
 * `shareToken` is present only for the person who just finished, carried on
 * the query string from their own submission. Without it there is no link to
 * offer, so the page offers the quiz instead.
 *
 * The staggered entrance is CSS, keyed off the direct children of
 * `.ctest-pair` -- see globals.css. Reordering or wrapping those children
 * changes which delay each block gets.
 */
export function PairResultView({
  result,
  shareToken,
}: {
  result: PairResult;
  shareToken: string | null;
}) {
  return (
    <CtestShell align="top">
      <div className="ctest-pair relative z-10">
        <ScoreHero result={result} />
        <SharedValues result={result} />
        <DifferencePull difference={result.difference} />
        <PeopleCompare people={result.people} />
        <ShareClose shareToken={shareToken} />
      </div>
    </CtestShell>
  );
}
