"use client";

import Image from "next/image";
import {
  messagesFor,
  type ConversationLanguage,
} from "../../i18n/conversation.messages";
import styles from "./FastQuestions.module.css";

export type FastQuestionsCompletionProps = {
  onContinue: () => void;
  language: ConversationLanguage;
};

/**
 * The boundary between the two phases. The copy names what Phase 2 actually is
 * — a group that taps Continue should know what they are continuing into.
 */
export function FastQuestionsCompletion({ language, onContinue }: FastQuestionsCompletionProps) {
  const messages = messagesFor(language);

  return (
    <section aria-labelledby="fast-questions-completion-heading" className={styles.completion}>
      <Image alt="" aria-hidden className={styles.completionMark} height={42} src="/icon.svg" width={42} />
      <h1 id="fast-questions-completion-heading">{messages.transitionHeading}</h1>
      <p>{messages.transitionBody}</p>
      <button className={styles.continueButton} onClick={onContinue} type="button">
        {messages.continueLabel}
      </button>
    </section>
  );
}
