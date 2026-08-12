import type { Metadata } from "next";
import { FastQuestionsNotice } from "@/features/conversation/fastQuestions/components/FastQuestionsNotice";
import { eventIdSchema } from "@/features/conversation/fastQuestions/schemas/fastQuestions.schema";
import { conversationLanguage } from "@/features/conversation/i18n/conversation.messages";
import { EventFeedbackScreen } from "@/features/eventFeedback/components/EventFeedbackScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Before you go | Weft",
  description: "Tell us how tonight went.",
  robots: { index: false, follow: false },
};

/**
 * Its own route rather than a branch of the conversation page: the session is
 * already `finished` by the time anyone gets here, so routing on session state
 * could not express this screen. A real route also means a reload mid-typing
 * returns to the form instead of to the conversation.
 *
 * The language rides in on the query string from the closing screen, which
 * already knows it. Reading it from the session instead would mean one more
 * backend call for a value we were just handed.
 */
export default async function EventFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const parsed = eventIdSchema.safeParse((await params).eventId);
  if (!parsed.success) return <FastQuestionsNotice status="invalid" />;

  const { lang } = await searchParams;
  return (
    <EventFeedbackScreen
      eventId={parsed.data}
      language={conversationLanguage(lang ?? "en")}
    />
  );
}
