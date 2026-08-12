import Image from "next/image";
import type { ConversationLanguage } from "@/features/conversation/i18n/conversation.messages";
import { eventFeedbackMessagesFor } from "../i18n/eventFeedback.messages";
import styles from "./EventFeedback.module.css";

export type EventFeedbackThanksProps = {
  language: ConversationLanguage;
};

/** Terminal. There is nowhere to go from here and nothing left to poll. */
export function EventFeedbackThanks({ language }: EventFeedbackThanksProps) {
  const messages = eventFeedbackMessagesFor(language);

  return (
    <main className={styles.shell}>
      <section
        aria-labelledby="event-feedback-thanks-heading"
        className={`${styles.frame} ${styles.thanksFrame}`}
      >
        <Image alt="" aria-hidden className={styles.mark} height={42} src="/icon.svg" width={42} />
        <h1 className={styles.heading} id="event-feedback-thanks-heading">
          {messages.thanksHeading}
        </h1>
        <p className={styles.thanksBody}>{messages.thanksBody}</p>
      </section>
    </main>
  );
}
