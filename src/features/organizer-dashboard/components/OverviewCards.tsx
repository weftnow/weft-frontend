import type { DashboardSummary } from "../schemas/dashboard.schema";
import styles from "./Dashboard.module.css";

const SCORES = [5, 4, 3, 2, 1] as const;

/**
 * The Overview, free tier.
 *
 * Participation is a fraction rather than a percentage because "61 of 64"
 * survives a small room and "95%" does not — at nine attendees a percentage
 * implies a precision the count does not have.
 *
 * When the backend suppresses the ratings it sends nulls, and this renders an
 * explanation instead. The suppression is a privacy rule, not an error, so it
 * reads as "not yet" rather than as something broken.
 */
export function OverviewCards({ summary }: { summary: DashboardSummary }) {
  const total = Object.values(summary.rating_distribution).reduce(
    (running, count) => running + count,
    0,
  );

  return (
    <div className={styles.cardGrid}>
      <section className={styles.card}>
        <h2>Participation</h2>
        <p className={styles.hero}>
          {summary.checked_in} <span className={styles.of}>/ {summary.submitted}</span>
        </p>
        <p className={styles.caption}>checked in</p>
        <p className={styles.secondary}>{summary.groups} tables formed</p>
      </section>

      <section className={styles.card}>
        <h2>Experience</h2>
        {summary.suppressed ? (
          <p className={styles.caption}>
            Not enough responses yet — ratings appear once at least five guests
            have answered.
          </p>
        ) : (
          <>
            <p className={styles.hero}>
              {summary.average_rating} <span className={styles.of}>/ 5</span>
            </p>
            <p className={styles.secondary}>
              {summary.would_attend_again_pct}% would attend another event
            </p>
            <ul className={styles.distribution}>
              {SCORES.map((score) => {
                const count = summary.rating_distribution[String(score)] ?? 0;
                const width = total === 0 ? 0 : Math.round((count / total) * 100);
                return (
                  <li key={score}>
                    <span className={styles.scoreLabel}>{score}</span>
                    <span className={styles.track}>
                      <span className={styles.fill} style={{ width: `${width}%` }} />
                    </span>
                    <span className={styles.scoreCount}>{count}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className={`${styles.card} ${styles.wide}`}>
        <h2>What guests said</h2>
        {summary.comments.length === 0 ? (
          <p className={styles.caption}>No comments yet.</p>
        ) : (
          <ul className={styles.comments}>
            {summary.comments.map((comment, index) => (
              <li key={index}>{comment}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
