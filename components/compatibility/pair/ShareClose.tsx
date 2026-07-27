import Link from "next/link";
import { content } from "@/content";
import { ShareLink } from "@/components/compatibility/ShareLink";
import { PremiumButton } from "@/components/ui/PremiumButton";

/** The page's only ask, after the result has been given whole. */
export function ShareClose({ shareToken }: { shareToken: string | null }) {
  const copy = content.compatibilityTest.pair;

  return (
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
  );
}
