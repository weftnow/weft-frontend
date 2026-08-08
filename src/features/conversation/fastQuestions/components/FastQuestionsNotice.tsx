"use client";

import Image from "next/image";
import styles from "./FastQuestions.module.css";

export type FastQuestionsNoticeProps = {
  status: "loading" | "invalid" | "error";
  onRetry?: () => void;
};

const noticeCopy = {
  loading: "Preparing your conversation…",
  invalid: "This event link isn’t valid.",
  error: "We couldn’t sync the conversation.",
} as const;

export function FastQuestionsNotice({ status, onRetry }: FastQuestionsNoticeProps) {
  return (
    <section aria-live={status === "loading" ? "polite" : undefined} className={styles.notice}>
      <Image alt="" aria-hidden className={styles.noticeMark} height={42} src="/icon.svg" width={42} />
      <p>{noticeCopy[status]}</p>
      {status === "error" && onRetry ? (
        <button className={styles.retryButton} onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </section>
  );
}
