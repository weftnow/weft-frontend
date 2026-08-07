import type { Metadata } from "next";
import { CompatibilityNotice } from "@/features/demo-b2c/components/CompatibilityNotice";
import { PairResultView } from "@/features/demo-b2c/components/PairResultView";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { readShareParam } from "@/features/demo-b2c/model/links";
import { loadPair } from "@/lib/server/pair";

export const metadata: Metadata = {
  title: "Weft: Your compatibility",
  description: "How two people connect, in words rather than a score.",
  // Both people's profiles sit behind this URL, and anyone holding it can read
  // them. It must never enter an index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * A switch rather than a ternary so a fourth PairOutcome status becomes a
 * type error here instead of silently rendering "we couldn't reach the
 * service" at someone whose problem is something else.
 */
function pickNotice(status: "not_found" | "unavailable") {
  const copy = demoB2cContent.pair;
  switch (status) {
    case "not_found":
      return copy.missing;
    case "unavailable":
      return copy.unavailable;
    default: {
      const never: never = status;
      throw new Error(`unhandled pair status: ${String(never)}`);
    }
  }
}

export default async function PairPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const outcome = await loadPair(id);
  const copy = demoB2cContent.pair;

  if (outcome.status !== "ok") {
    const notice = pickNotice(outcome.status);
    return (
      <main id="main-content">
        <CompatibilityNotice
          eyebrow={notice.eyebrow}
          headline={notice.headline}
          body={notice.body}
          cta={{ href: "/compatibility-test", label: copy.restart }}
        />
      </main>
    );
  }

  return (
    <main id="main-content">
      {/* Present only for the person who just finished: their own share token,
          carried here on the query string so the referral chain survives past
          depth one. Anyone arriving on a forwarded link sees no token, and is
          offered the quiz instead. */}
      <PairResultView result={outcome.result} shareToken={readShareParam(query.share)} />
    </main>
  );
}
