import styles from "./Dashboard.module.css";

export type Outcomes = {
  responders: number;
  selected_someone: number;
  mutual_pairs: number;
  per_table: { index: number; mutual: number }[];
};

/**
 * A zero here means nobody answered, not that nobody connected. Rendering
 * "0 mutual reconnects" for an event with no feedback would tell an organizer
 * their night failed when the truth is the question went unanswered — so the
 * empty case is its own screen, not a number.
 */
export function OutcomeCards({ outcomes }: { outcomes: Outcomes }) {
  if (outcomes.responders === 0) {
    return (
      <section className={`${styles.card} ${styles.wide}`}>
        <h2>No feedback yet</h2>
        <p className={styles.caption}>
          Results appear once guests answer at the end of the event.
        </p>
      </section>
    );
  }
  return (
    <div className={styles.cardGrid}>
      <section className={`${styles.card} ${styles.wide}`}>
        <p className={styles.hero}>{outcomes.mutual_pairs}</p>
        <h2>Mutual reconnects</h2>
        <p className={styles.caption}>
          Pairs where both people said they wanted to meet again.
        </p>
      </section>

      <section className={styles.card}>
        <h2>Wanted to meet someone again</h2>
        <p className={styles.secondary}>
          {outcomes.selected_someone} of {outcomes.responders} respondents
        </p>
      </section>

      {outcomes.per_table.length > 0 ? (
        <section className={styles.card}>
          <h2>By table</h2>
          <ul className={styles.plainList}>
            {outcomes.per_table.map((table) => (
              <li key={table.index}>
                Table {table.index}: {table.mutual}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
