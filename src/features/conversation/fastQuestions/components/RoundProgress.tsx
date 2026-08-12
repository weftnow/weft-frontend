import type { ConversationMessages } from "../../i18n/conversation.messages";
import styles from "./FastQuestions.module.css";

export type RoundProgressProps = {
  currentRoundIndex: number;
  messages: Pick<ConversationMessages, "progressCount" | "roundProgress">;
};

const ROUND_COUNT = 3;

export function RoundProgress({ currentRoundIndex, messages }: RoundProgressProps) {
  const currentRound = Math.min(Math.max(currentRoundIndex, 0), ROUND_COUNT - 1);

  return (
    <footer aria-label={messages.roundProgress} className={styles.roundProgress}>
      <span className={styles.progressLabel}>{messages.roundProgress}</span>
      <div className={styles.progressBars}>
        {Array.from({ length: ROUND_COUNT }, (_, index) => (
          <span
            aria-current={index === currentRound ? "step" : undefined}
            className={styles.progressBar}
            data-round-indicator
            key={index}
          />
        ))}
      </div>
      <span className={styles.progressCount}>
        {messages.progressCount(currentRound + 1, ROUND_COUNT)}
      </span>
    </footer>
  );
}
