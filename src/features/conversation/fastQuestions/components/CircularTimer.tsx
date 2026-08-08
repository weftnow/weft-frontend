import styles from "./CircularTimer.module.css";

const VIEWBOX_SIZE = 240;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 114;
const STROKE_WIDTH = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type CircularTimerProps = {
  /** Total length of the round, in seconds. */
  durationSeconds: number;
  /** Milliseconds left, as already derived by the caller's own clock. */
  remainingMilliseconds: number;
  /** Whether the countdown is actively ticking (drives the sweep animation). */
  running: boolean;
};

// Intentionally duplicated from useCountdown's formatCountdown: this
// component is pure presentation and must not import the hook module, so it
// keeps its own tiny copy of the same ceiling-based MM:SS formatting.
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function CircularTimer({
  durationSeconds,
  remainingMilliseconds,
  running,
}: CircularTimerProps) {
  const durationMilliseconds = Math.max(0, durationSeconds) * 1_000;
  const clampedRemaining = clamp(remainingMilliseconds, 0, durationMilliseconds || Infinity);
  const progress = durationMilliseconds > 0 ? clampedRemaining / durationMilliseconds : 0;
  // Round to avoid float noise (e.g. 0.49999999999999994) leaking into the
  // data attribute consumers and tests key off of.
  const roundedProgress = Number(progress.toFixed(4));
  const dashOffset = CIRCUMFERENCE * (1 - roundedProgress);
  const secondsRemaining = Math.ceil(clampedRemaining / 1_000);

  return (
    <div
      aria-label={`${secondsRemaining} seconds remaining`}
      className={styles.circularTimer}
      data-progress={String(roundedProgress)}
      role="timer"
    >
      <svg aria-hidden="true" className={styles.ring} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        <circle
          className={styles.track}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          className={running ? `${styles.progress} ${styles.progressRunning}` : styles.progress}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeWidth={STROKE_WIDTH}
        />
      </svg>
      <div className={styles.readout}>
        <span className={styles.time}>{formatTime(remainingMilliseconds)}</span>
        <span className={styles.label}>time left</span>
      </div>
    </div>
  );
}
