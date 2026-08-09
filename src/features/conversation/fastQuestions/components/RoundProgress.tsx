import styles from "./FastQuestions.module.css";

export type RoundProgressProps = {
  currentRoundIndex: number;
};

const ROUND_COUNT = 3;

export function RoundProgress({ currentRoundIndex }: RoundProgressProps) {
  const currentRound = Math.min(Math.max(currentRoundIndex, 0), ROUND_COUNT - 1);

  return (
    <footer aria-label="Round progress" className={styles.roundProgress}>
      <span className={styles.progressLabel}>Round progress</span>
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
      <span className={styles.progressCount}>{currentRound + 1} of {ROUND_COUNT}</span>
    </footer>
  );
}
