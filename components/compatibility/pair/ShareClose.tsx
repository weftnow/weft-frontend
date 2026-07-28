import Link from "next/link";
import { content } from "@/content";
import { ShareLink } from "@/components/compatibility/ShareLink";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { ThreadCross } from "./ThreadCross";

/** The page's only ask, after the result has been given whole. */
export function ShareClose({ shareToken }: { shareToken: string | null }) {
  const copy = content.compatibilityTest.pair;

  return (
    <section className="ctest-result-share">
      <div className="ctest-result-share-copy">
        <span aria-hidden className="ctest-result-share-threads">
          <ThreadCross />
        </span>
        <div>
          <h2 className="ctest-sub-prompt">{copy.shareHeadline}</h2>
          <p className="ctest-body">{copy.shareSub}</p>
        </div>
      </div>
      {shareToken ? (
        <ShareLink token={shareToken} />
      ) : (
        <PremiumButton href="/compatibility-test" tone="ember">
          {copy.restart}
        </PremiumButton>
      )}
      <Link className="ctest-result-matches-link" href="/compatibility-test/matches">
        {copy.matchesLink}
      </Link>
    </section>
  );
}
