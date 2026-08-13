import Image from "next/image";
import Link from "next/link";
import { questionnaireMessages } from "../i18n/questionnaire.messages";
import type { Language } from "../schemas/questionnaire.contract.schema";

export function QuestionnaireCompletion({
  eventId,
  eventName,
  language,
}: {
  eventId: string;
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
      {/* The only way out of this screen. Without it the guest's evening ends
          here: nothing else in the app links to an /e/ route the guest can
          reach, and the conversation is behind one. */}
      <Link
        className="mt-2 rounded-full border border-ink/16 px-5 py-2.5 text-[0.95rem] text-ink/80 transition-colors hover:border-ink/32 hover:text-ink"
        href={`/e/${eventId}/conversation?lang=${language}`}
      >
        {messages.continueToConversation}
      </Link>
    </main>
  );
}
