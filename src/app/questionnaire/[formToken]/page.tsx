import type { Metadata } from "next";
import { loadQuestionnaire } from "@/features/questionnaire/api/server/questionnaire.gateway";
import { QuestionnaireWithNavigation } from "@/features/questionnaire/components/QuestionnaireWithNavigation";
import { QuestionnaireNotice } from "@/features/questionnaire/components/QuestionnaireNotice";
import { formTokenSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Attendee questionnaire | Weft",
  description: "Tell Weft who you would genuinely like to meet at the event.",
  robots: { index: false, follow: false },
};

export default async function EventQuestionnairePage({
  params,
}: {
  params: Promise<{ formToken: string }>;
}) {
  const tokenResult = formTokenSchema.safeParse((await params).formToken);
  if (!tokenResult.success) {
    return <QuestionnaireNotice kind="invalidLink" language="en" />;
  }

  const outcome = await loadQuestionnaire(tokenResult.data);
  if (outcome.status !== "ok") {
    return <QuestionnaireNotice kind={outcome.status} language="en" />;
  }

  return (
    <QuestionnaireWithNavigation formToken={tokenResult.data} initialQuestionnaire={outcome.questionnaire} />
  );
}
