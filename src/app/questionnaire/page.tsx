import type { Metadata } from "next";
import { QuestionnaireNotice } from "@/features/questionnaire/components/QuestionnaireNotice";

export const metadata: Metadata = {
  title: "Attendee questionnaire | Weft",
  description: "Tell Weft who you would genuinely like to meet at the event.",
};

export default function QuestionnairePage() {
  return <QuestionnaireNotice kind="missingLink" language="en" />;
}
