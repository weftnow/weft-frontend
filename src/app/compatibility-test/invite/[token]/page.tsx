import type { Metadata } from "next";
import { CompatibilityTest } from "@/features/demo-b2c/components/CompatibilityTest";
import { CompatibilityNotice } from "@/features/demo-b2c/components/CompatibilityNotice";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { toQuizQuestions } from "@/features/demo-b2c/schemas/compatibilityQuestions";
import { loadInvite } from "@/features/demo-b2c/api/server/invite";

export const metadata: Metadata = {
  title: "Weft: You've been invited",
  description:
    "Someone wants to know how the two of you connect. Twenty questions, about four minutes.",
  // An invite URL is a capability -- anyone holding it can answer as the
  // friend. Indexing one would hand it to everyone. The sender's name is
  // deliberately absent here too: it would take a second fetch and would
  // unfurl their name into every chat the link is pasted into.
  robots: { index: false, follow: false },
};

// Per-token data with a 30-day life. Nothing here is safe to prerender.
export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const outcome = await loadInvite(token);
  const errors = demoB2cContent.inviteError;

  if (outcome.status !== "ok") {
    const notice =
      outcome.status === "expired"
        ? errors.expired
        : outcome.status === "not_found"
          ? errors.unknown
          : errors.unavailable;

    return (
      <main id="main-content">
        <CompatibilityNotice
          eyebrow={notice.eyebrow}
          headline={notice.headline}
          body={notice.body}
          // An outage is temporary and the link is still good, so the only way
          // out offered there is to try again -- not to abandon the invite.
          cta={
            outcome.status === "unavailable"
              ? undefined
              : { href: "/compatibility-test", label: errors.cta }
          }
        />
      </main>
    );
  }

  return (
    <main id="main-content">
      <CompatibilityTest
        // The sender's own questions, not the current bank: a later bank edit
        // must not leave the two of them answering different things.
        questions={toQuizQuestions(outcome.invite.questions)}
        invite={{ token, fromName: outcome.invite.from_name }}
      />
    </main>
  );
}
