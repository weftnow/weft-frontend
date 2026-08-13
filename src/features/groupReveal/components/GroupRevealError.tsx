import Image from "next/image";
import type { GroupRevealLoadErrorKind } from "../api/groupReveal.api";
import type { GroupRevealMessages } from "../i18n/groupReveal.messages";

export function GroupRevealError({
  error,
  messages,
  onAction,
}: {
  error: GroupRevealLoadErrorKind;
  messages: GroupRevealMessages;
  onAction: () => void;
}) {
  const copy =
    error === "no_session"
      ? {
          actionLabel: messages.restartQuestionnaire,
          body: messages.missingSessionBody,
          title: messages.missingSessionTitle,
        }
      : {
          actionLabel: messages.retry,
          body: messages.unavailableBody,
          title: messages.unavailableTitle,
        };

  return (
    <main className="questionnaire-shell questionnaire-state">
      <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
      <div className="flex flex-col items-center gap-5" role="alert">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/52">
          {messages.errorEyebrow}
        </p>
        <h1 className="text-center text-2xl font-medium tracking-[-0.04em] text-ink">
          {copy.title}
        </h1>
        <p className="max-w-[26rem] text-balance text-center text-[0.95rem] leading-6 text-ink/60">
          {copy.body}
        </p>
      </div>
      <button
        className="mt-2 min-h-11 rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
        onClick={onAction}
        type="button"
      >
        {copy.actionLabel}
      </button>
    </main>
  );
}
