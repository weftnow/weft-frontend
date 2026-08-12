import type { Metadata } from "next";
import { Conversation } from "@/features/conversation/components/Conversation";
import { FastQuestionsNotice } from "@/features/conversation/fastQuestions/components/FastQuestionsNotice";
import { eventIdSchema } from "@/features/conversation/fastQuestions/schemas/fastQuestions.schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  // The page is both phases now, not just Fast Questions.
  title: "Your conversation | Weft",
  description: "A guided conversation for your Weft group.",
  robots: { index: false, follow: false },
};

export default async function EventConversationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const parsed = eventIdSchema.safeParse((await params).eventId);
  if (!parsed.success) return <FastQuestionsNotice status="invalid" />;
  return <Conversation eventId={parsed.data} />;
}
