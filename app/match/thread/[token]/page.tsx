import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompatibilityNotice } from "@/components/compatibility/CompatibilityNotice";
import { MatchesView } from "@/components/compatibility/MatchesView";
import { content } from "@/content";
import { pairHref } from "@/lib/links";
import { loadThread, type ThreadOutcome } from "@/lib/server/thread";

export const metadata: Metadata = {
  title: "Weft: Your thread",
  // A return link is a capability: whoever holds it sees the result. Indexing
  // one would hand it to everyone.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Split from the page so each state renders in a test without a request
 * context. A single pair redirects rather than rendering: one canonical
 * result URL beats a second view of the same data that could drift from it.
 */
export function ThreadScreen({ outcome }: { outcome: ThreadOutcome }) {
  const copy = content.compatibilityTest.thread;

  if (outcome.status === "not_found") {
    return (
      <CompatibilityNotice
        eyebrow={copy.unknown.eyebrow}
        headline={copy.unknown.headline}
        body={copy.unknown.body}
        cta={{ href: "/match", label: copy.unknown.cta }}
      />
    );
  }

  if (outcome.status === "unavailable") {
    return (
      <CompatibilityNotice
        eyebrow={copy.unavailable.eyebrow}
        headline={copy.unavailable.headline}
        body={copy.unavailable.body}
      />
    );
  }

  if (outcome.pairs.length === 0) {
    return (
      <CompatibilityNotice
        eyebrow={copy.waiting.eyebrow}
        headline={copy.waiting.headline}
        body={copy.waiting.body}
      />
    );
  }

  return <MatchesView pairs={outcome.pairs} />;
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const outcome = await loadThread(token);

  if (outcome.status === "ok" && outcome.pairs.length === 1) {
    redirect(pairHref(outcome.pairs[0].pair_id));
  }

  return (
    <main id="main-content">
      <ThreadScreen outcome={outcome} />
    </main>
  );
}
