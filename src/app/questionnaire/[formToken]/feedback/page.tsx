import type { Metadata } from "next";
import { conversationLanguage } from "@/features/conversation/i18n/conversation.messages";
import { EventFeedbackScreen } from "@/features/eventFeedback/components/EventFeedbackScreen";
import { formTokenSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Before you go | Weft",
  description: "Tell us how tonight went.",
  robots: { index: false, follow: false },
};

/**
 * Keyed by form token, alongside the conversation and the group reveal it
 * follows. The event-id route this replaces could not work: the guest's cookie
 * holds a session handle, and only `/f/{formToken}/resume` turns one of those
 * into a token the backend will accept.
 *
 * The language rides in on the query string from the closing screen, which
 * already knows it. Reading it from the session instead would mean one more
 * backend call for a value we were just handed.
 */
export default async function EventFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ formToken: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const parsed = formTokenSchema.safeParse((await params).formToken);
  if (!parsed.success) {
    return (
      <main>
        <p role="status">This session link is invalid.</p>
      </main>
    );
  }

  const { lang } = await searchParams;
  return (
    <EventFeedbackScreen
      language={conversationLanguage(lang ?? "en")}
      sessionKey={parsed.data}
    />
  );
}
