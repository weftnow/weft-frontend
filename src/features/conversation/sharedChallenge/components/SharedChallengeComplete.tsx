"use client";

import Image from "next/image";
import Link from "next/link";
import { eventFeedbackMessagesFor } from "@/features/eventFeedback/i18n/eventFeedback.messages";
import {
  messagesFor,
  type ConversationLanguage,
} from "../../i18n/conversation.messages";
import styles from "./SharedChallenge.module.css";

export type SharedChallengeCompleteProps = {
  /** The backend's closing line, already in the session's language. */
  closingLine: string | null;
  language: ConversationLanguage;
  eventId: string;
};

/**
 * The backend populates `closing_line` the moment a session finishes, so null
 * only shows up if a poll raced ahead of that write. The local copy is the same
 * sentence in the same language, so a race changes nothing the group can see.
 *
 * The feedback link carries the language rather than making the next page ask
 * the backend for a value this screen already has. It is a plain link, not a
 * fetch-then-branch: the feedback page reads the submitted status itself, so a
 * guest who already answered lands on thanks without this screen needing to
 * know or spend a request finding out.
 */
export function SharedChallengeComplete({
  closingLine,
  eventId,
  language,
}: SharedChallengeCompleteProps) {
  const messages = messagesFor(language);
  const feedbackMessages = eventFeedbackMessagesFor(language);

  return (
    <main className={styles.shell}>
      <section aria-labelledby="shared-challenge-complete-heading" className={styles.completion}>
        <Image alt="" aria-hidden className={styles.mark} height={42} src="/icon.svg" width={42} />
        <h1 className={styles.closingLine} id="shared-challenge-complete-heading">
          {closingLine ?? messages.closingLineFallback}
        </h1>
        <Link
          className={styles.feedbackLink}
          href={`/e/${eventId}/feedback?lang=${language}`}
        >
          {feedbackMessages.heading}
        </Link>
      </section>
    </main>
  );
}
