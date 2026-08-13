"use client";

import { useRouter } from "next/navigation";
import { Questionnaire, type QuestionnaireProps } from "./Questionnaire";

export function QuestionnaireWithNavigation(props: Omit<QuestionnaireProps, "onCompleted">) {
  const router = useRouter();
  return <Questionnaire {...props} onCompleted={(formToken) => router.replace(`/questionnaire/${encodeURIComponent(formToken)}/group`)} />;
}
