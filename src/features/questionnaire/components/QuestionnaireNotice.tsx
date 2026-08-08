import Image from "next/image";
import { questionnaireMessages, type QuestionnaireMessages } from "../i18n/questionnaire.messages";
import type { Language } from "../schemas/questionnaire.contract.schema";

export type QuestionnaireNoticeKind =
  | "loading"
  | "missingLink"
  | "invalidLink"
  | "notFound"
  | "notAccepting"
  | "unavailable"
  | "validation"
  | "versionConflict"
  | "idempotencyConflict";

function copyFor(kind: QuestionnaireNoticeKind, messages: QuestionnaireMessages) {
  switch (kind) {
    case "missingLink":
      return { title: messages.missingLinkTitle, body: messages.missingLinkBody };
    case "invalidLink":
      return { title: messages.invalidLinkTitle, body: messages.invalidLinkBody };
    case "notFound":
      return { title: messages.notFoundTitle, body: messages.notFoundBody };
    case "notAccepting":
      return { title: messages.notAcceptingTitle, body: messages.notAcceptingBody };
    default:
      return { title: messages.unavailableTitle, body: messages.unavailableBody };
  }
}

export function QuestionnaireNotice({
  kind,
  language,
  eventName,
}: {
  kind: QuestionnaireNoticeKind;
  language: Language;
  eventName?: string;
}) {
  const messages = questionnaireMessages[language];

  if (kind === "loading") {
    return (
      <main className="questionnaire-shell questionnaire-state">
        <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/52">
          {messages.openingEyebrow}
          {eventName ? ` · ${eventName}` : null}
        </p>
      </main>
    );
  }

  const copy = copyFor(kind, messages);

  return (
    <main className="questionnaire-shell questionnaire-state">
      <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
      <h1 className="text-center text-2xl font-medium tracking-[-0.04em] text-ink">
        {copy.title}
      </h1>
      <p className="max-w-[26rem] text-balance text-center text-[0.95rem] leading-6 text-ink/60">
        {copy.body}
      </p>
    </main>
  );
}
