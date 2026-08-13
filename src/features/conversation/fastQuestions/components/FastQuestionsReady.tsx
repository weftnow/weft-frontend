"use client";

import Image from "next/image";
import {
  messagesFor,
  type ConversationLanguage,
} from "../../i18n/conversation.messages";
import styles from "./FastQuestions.module.css";

export type FastQuestionsReadyProps = {
  onStart: () => void;
  isStarting: boolean;
  language: ConversationLanguage;
};

/**
 * The lobby, and the reason it exists: Start is one tap for the whole table.
 * The group's turn clocks all run from the `started_at` the backend stamps, so
 * a phone that opened the page early must sit here until someone decides the
 * table is ready — not start the round on everyone's behalf by arriving first.
 */
export function FastQuestionsReady({ isStarting, language, onStart }: FastQuestionsReadyProps) {
  const messages = messagesFor(language);

  return (
    <section aria-labelledby="fast-questions-ready-heading" className={styles.ready}>
      <Image alt="" aria-hidden className={styles.readyMark} height={42} src="/icon.svg" width={42} />
      <h1 id="fast-questions-ready-heading">{messages.readyHeading}</h1>
      <p>{messages.readyBody}</p>
      <button
        className={styles.startButton}
        disabled={isStarting}
        onClick={onStart}
        type="button"
      >
        {isStarting ? messages.starting : messages.startLabel}
      </button>
    </section>
  );
}
