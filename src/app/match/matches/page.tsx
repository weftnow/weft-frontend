import type { Metadata } from "next";
import { CompatibilityNotice } from "@/features/demo-b2c/components/CompatibilityNotice";
import { CtestShell } from "@/features/demo-b2c/components/CtestShell";
import { MatchesView } from "@/features/demo-b2c/components/MatchesView";
import { ReshareLink } from "@/features/demo-b2c/components/ReshareLink";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { loadMyPairs, type MyPairsOutcome } from "@/features/demo-b2c/api/server/myPairs";
import { readSessionId } from "@/features/demo-b2c/api/server/session";

const MATCHES_PATH = "/match/matches";
const QUIZ_PATH = "/match";

export const metadata: Metadata = {
  title: "Weft: Your threads",
  description: "Everyone who has answered your compatibility link.",
  // Whatever the cookie holder's matches are, complete with both profiles
  // one click away. It must never enter an index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The five screens, split out from the page so each can be rendered in a test
 * without a request context -- `readSessionId()` throws outside one.
 */
export function MatchesScreen({ outcome }: { outcome: MyPairsOutcome }) {
  const copy = demoB2cContent.matches;

  if (outcome.status === "no_session") {
    return (
      <CompatibilityNotice
        eyebrow={copy.none.eyebrow}
        headline={copy.none.headline}
        body={copy.none.body}
        cta={{ href: QUIZ_PATH, label: copy.none.cta }}
      />
    );
  }

  if (outcome.status === "not_found") {
    return (
      <CompatibilityNotice
        eyebrow={copy.lost.eyebrow}
        headline={copy.lost.headline}
        body={copy.lost.body}
        cta={{ href: QUIZ_PATH, label: copy.lost.cta }}
      />
    );
  }

  if (outcome.status === "unavailable") {
    return (
      <CompatibilityNotice
        eyebrow={copy.unavailable.eyebrow}
        headline={copy.unavailable.headline}
        body={copy.unavailable.body}
        // Back to this same page: their thread is fine, and sending them to
        // question one would be a lie about what went wrong.
        cta={{ href: MATCHES_PATH, label: copy.unavailable.cta }}
      />
    );
  }

  if (outcome.pairs.length === 0) {
    // Not CompatibilityNotice: the point of this screen is the mint button,
    // and the notice takes a link, not an interactive child.
    return (
      <CtestShell>
        <div className="relative z-10 flex flex-col items-center text-center">
          <span className="ctest-eyebrow">{copy.waiting.eyebrow}</span>
          <h1 className="ctest-prompt">{copy.waiting.headline}</h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-ink/60">
            {copy.waiting.body}
          </p>
          <ReshareLink />
        </div>
      </CtestShell>
    );
  }

  return <MatchesView pairs={outcome.pairs} />;
}

export default async function MatchesPage() {
  const outcome = await loadMyPairs(await readSessionId());

  return (
    <main id="main-content">
      <MatchesScreen outcome={outcome} />
    </main>
  );
}
