import Image from "next/image";
import { questionnaireMessages } from "../i18n/questionnaire.messages";
import type { Language } from "../schemas/questionnaire.contract.schema";

export function QuestionnaireCompletion({
  eventName,
  language,
}: {
  eventName: string;
  language: Language;
}) {
  const messages = questionnaireMessages[language];

  return (
    <main className="questionnaire-shell questionnaire-state">
      <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/52">{eventName}</p>
      <h1 className="text-center text-2xl font-medium tracking-[-0.04em] text-ink">
        {messages.completionMessages[0]}
      </h1>
      <p className="max-w-[26rem] text-balance text-center text-[0.95rem] leading-6 text-ink/60">
        {messages.completionMessages[1]}
      </p>
    </main>
  );
}
