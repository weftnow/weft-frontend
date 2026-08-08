import type { Metadata } from "next";
import { Questionnaire } from "@/features/questionnaire/components/Questionnaire";

export const metadata: Metadata = {
  title: "Attendee questionnaire | Weft",
  description: "Tell Weft who you would genuinely like to meet at the event.",
};

export default function QuestionnairePage() {
  return <Questionnaire />;
}
