"use client";

import Image from "next/image";
import {
  messagesFor,
  type ConversationLanguage,
} from "../../i18n/conversation.messages";
import styles from "./FastQuestions.module.css";

export type FastQuestionsNoticeProps = {
  status: "loading" | "invalid" | "error";
  onRetry?: () => void;
  /**
   * Every notice can be reached before a session has loaded — an invalid link
   * has no session at all — so the language is optional and English is the
   * same default the backend falls back to for an unknown one.
   */
  language?: ConversationLanguage;
};

export function FastQuestionsNotice({
  language = "en",
  onRetry,
  status,
}: FastQuestionsNoticeProps) {
  const messages = messagesFor(language);
  const noticeCopy = {
    loading: messages.loading,
    invalid: messages.invalidLink,
    error: messages.syncError,
  } as const;

  return (
    <section aria-live={status === "loading" ? "polite" : undefined} className={styles.notice}>
      <Image alt="" aria-hidden className={styles.noticeMark} height={42} src="/icon.svg" width={42} />
      <p>{noticeCopy[status]}</p>
      {status === "error" && onRetry ? (
        <button className={styles.retryButton} onClick={onRetry} type="button">
          {messages.retry}
        </button>
      ) : null}
    </section>
  );
}
