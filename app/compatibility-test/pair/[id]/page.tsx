import type { Metadata } from "next";
import { CompatibilityNotice } from "@/components/compatibility/CompatibilityNotice";
import { PairResultView } from "@/components/compatibility/PairResultView";
import { content } from "@/content";
import { readShareParam } from "@/lib/links";
import { loadPair } from "@/lib/server/pair";

export const metadata: Metadata = {
  title: "Weft: Your compatibility",
  description: "How two people connect, in words rather than a score.",
  // Both people's profiles sit behind this URL, and anyone holding it can read
  // them. It must never enter an index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PairPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const outcome = await loadPair(id);
  const copy = content.compatibilityTest.pair;

  if (outcome.status !== "ok") {
    const notice = outcome.status === "not_found" ? copy.missing : copy.unavailable;
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
