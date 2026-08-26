import type { Metadata } from "next";
import { QuestionnaireNotice } from "@/features/questionnaire/components/QuestionnaireNotice";

export const metadata: Metadata = {
  title: "Attendee questionnaire | Weft",
  description: "Tell Weft who you would genuinely like to meet at the event.",
};

/**
 * Where an attendee lands with no usable link.
 *
 * `reason=invalid` is what /l/[linkToken] redirects a spent link to. Its copy
 * already reads "Ask the event organizer for a new link or QR code", which is
 * the recovery, stated to the one person who can start it.
 */
export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <QuestionnaireNotice kind={reason === "invalid" ? "invalidLink" : "missingLink"} language="en" />
  );
}
