import type { Metadata } from "next";
import { CompatibilityTest } from "@/components/compatibility/CompatibilityTest";
import { toQuizQuestions } from "@/lib/compatibilityQuestions";
import { loadBank } from "@/lib/server/bank";

export const metadata: Metadata = {
  title: "Weft: Compatibility Test",
  description:
    "Twenty quick questions, then a link to send one person. Your compatibility appears when they answer.",
};

// The bank is runtime data, not build-time content: a static prerender would
// freeze whatever loadBank() returned at build time -- including a fallback
// bank if the backend happened to be down -- into every deploy until the
// next build. loadBank's own hour-long memo already does the caching that
// matters, per-process rather than per-build.
export const dynamic = "force-dynamic";

/**
 * The questions are server data, so they are fetched here and handed down --
 * that keeps the backend URL and proxy key out of the client bundle entirely.
 */
export default async function CompatibilityTestPage() {
  const { bank } = await loadBank();
  return (
    <main id="main-content">
      <CompatibilityTest questions={toQuizQuestions(bank.questions)} />
    </main>
  );
}
