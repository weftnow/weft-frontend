import Link from "next/link";
import { content } from "@/content";
import { CtestShell } from "@/components/compatibility/CtestShell";
import { ShareLink } from "@/components/compatibility/ShareLink";
import { DifferencePull } from "@/components/compatibility/pair/DifferencePull";
import { PeopleCompare } from "@/components/compatibility/pair/PeopleCompare";
import { ScoreHero } from "@/components/compatibility/pair/ScoreHero";
import { SharedValues } from "@/components/compatibility/pair/SharedValues";
import { PremiumButton } from "@/components/ui/PremiumButton";
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
  const copy = content.compatibilityTest.pair;

  return (
    <CtestShell align="top">
      <div className="ctest-pair relative z-10">
        <ScoreHero result={result} />
        <SharedValues result={result} />
        <DifferencePull difference={result.difference} />

        <PeopleCompare people={result.people} />

        <section className="flex flex-col items-center text-center">
          {shareToken ? (
            <>
              {/* Smaller than the band above it: the result is the page, and
                  the next invitation is the offer that follows it. */}
              <h2 className="ctest-sub-prompt">{copy.shareHeadline}</h2>
              <p className="ctest-body max-w-md text-pretty text-center">
                {copy.shareSub}
              </p>
              <ShareLink token={shareToken} />
            </>
          ) : (
            <PremiumButton href="/compatibility-test" tone="ember">
              {copy.restart}
            </PremiumButton>
          )}

          {/* Offered whether or not they hold a token: someone who followed a
              forwarded link has no session, and the page they land on invites
              them to take the test rather than dead-ending. */}
          <Link
            className="mt-8 font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
            href="/compatibility-test/matches"
          >
            {copy.matchesLink}
          </Link>
        </section>
      </div>
    </CtestShell>
  );
}
