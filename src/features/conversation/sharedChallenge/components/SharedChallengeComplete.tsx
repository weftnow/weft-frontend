"use client";

import Image from "next/image";
import {
  messagesFor,
  type ConversationLanguage,
} from "../../i18n/conversation.messages";
import styles from "./SharedChallenge.module.css";

export type SharedChallengeCompleteProps = {
  /** The backend's closing line, already in the session's language. */
  closingLine: string | null;
  language: ConversationLanguage;
};

/**
 * The backend populates `closing_line` the moment a session finishes, so null
 * only shows up if a poll raced ahead of that write. The local copy is the same
 * sentence in the same language, so a race changes nothing the group can see.
 */
export function SharedChallengeComplete({ closingLine, language }: SharedChallengeCompleteProps) {
  const messages = messagesFor(language);

  return (
    <main className={styles.shell}>
      <section aria-labelledby="shared-challenge-complete-heading" className={styles.completion}>
        <Image alt="" aria-hidden className={styles.mark} height={42} src="/icon.svg" width={42} />
        <h1 className={styles.closingLine} id="shared-challenge-complete-heading">
          {closingLine ?? messages.closingLineFallback}
        </h1>
      </section>
    </main>
  );
}
