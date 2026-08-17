import type { DashboardSummary } from "../schemas/dashboard.schema";
import { StatTiles } from "./StatTiles";
import styles from "./Dashboard.module.css";

const SCORES = [5, 4, 3, 2, 1] as const;

/**
 * The Overview, free tier.
 *
 * Returns grid items rather than its own grid: the page composes Participation,
 * readiness, the share band and the intent charts into one `.cardGrid`, so
 * every card on the tab lines up on one set of columns. Three nested grids is
 * how a dashboard ends up with three different gutters.
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
    <>
      <section className={`${styles.card} ${styles.major}`}>
        <h2>Participation</h2>
        <StatTiles
          lead
          stats={[
            { value: summary.submitted, label: "Guests answered the form" },
            {
              value: summary.checked_in,
              of: summary.submitted,
              label: "Checked in on the night",
            },
            { value: summary.groups, label: "Tables formed" },
          ]}
        />
      </section>

      {/*
        Everything below reports on an event that has already happened. With no
        responses at all these are three empty boxes saying nothing, and the
        readiness card beside them already tells that story properly.
      */}
      {summary.submitted === 0 ? null : (
        <>
          <section className={`${styles.card} ${styles.major}`}>
            <h2>Experience</h2>
            {summary.suppressed ? (
              <p className={styles.caption}>
                Not enough responses yet — ratings appear once at least five
                guests have answered.
              </p>
            ) : (
              <>
                <StatTiles
                  stats={[
                    {
                      value: summary.average_rating ?? "—",
                      of: 5,
                      label: "Average rating",
                    },
                    {
                      value: `${summary.would_attend_again_pct ?? 0}%`,
                      label: "Would come to another",
                    },
                    {
                      value: summary.feedback_responses,
                      label: "Rated the night",
                    },
                  ]}
                />
                <ul className={styles.distribution}>
                  {SCORES.map((score) => {
                    const count = summary.rating_distribution[String(score)] ?? 0;
                    const width = total === 0 ? 0 : Math.round((count / total) * 100);
                    return (
                      <li key={score}>
                        <span className={styles.scoreLabel}>{score}</span>
                        <span className={styles.track}>
                          <span
                            className={styles.fill}
                            style={{ width: `${width}%` }}
                          />
                        </span>
                        <span className={styles.scoreCount}>{count}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <section className={`${styles.card} ${styles.minor}`}>
            <h2>What guests said</h2>
            {summary.comments.length === 0 ? (
              <p className={styles.caption}>
                Nobody left a written comment. Ratings above still count.
              </p>
            ) : (
              <ul className={styles.comments}>
                {summary.comments.map((comment, index) => (
                  <li key={index}>{comment}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
