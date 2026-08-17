import { EmptyState } from "./EmptyState";
import { UsersIcon } from "./icons";
import styles from "./Dashboard.module.css";

export type Outcomes = {
  responders: number;
  selected_someone: number;
  mutual_pairs: number;
  per_table: { index: number; mutual: number }[];
};

/**
 * Did the night work?
 *
 * A zero here means nobody answered, not that nobody connected. Rendering
 * "0 mutual reconnects" for an event with no feedback would tell an organizer
 * their night failed when the truth is the question went unanswered — so the
 * empty case is its own screen, not a number.
 *
 * Mutual pairs gets the one oversized figure on the dashboard. It is the
 * closest thing the product has to a verdict, and everything else on this tab
 * exists to qualify it — which is why the denominator is spelled out in words
 * underneath rather than turned into a percentage of a number nobody stated.
 */
export function OutcomeCards({ outcomes }: { outcomes: Outcomes }) {
  if (outcomes.responders === 0) {
    return (
      <EmptyState
        body="Results appear once guests answer the question at the end of the event."
        icon={<UsersIcon />}
        title="No feedback yet"
      />
    );
  }

  const hasTables = outcomes.per_table.length > 0;

  return (
    <>
      <section className={`${styles.card} ${hasTables ? styles.major : styles.wide}`}>
        <h2>Mutual reconnects</h2>
        <p className={styles.hero}>{outcomes.mutual_pairs}</p>
        <p className={styles.secondary}>
          {outcomes.mutual_pairs === 1 ? "pair" : "pairs"} where both people said
          they wanted to meet again
        </p>
        <p className={`${styles.caption} ${styles.cardFoot}`}>
          {outcomes.selected_someone} of the {outcomes.responders} people who
          answered picked at least one person.
        </p>
      </section>

      {hasTables ? (
        <section className={`${styles.card} ${styles.minor}`}>
          <h2>By table</h2>
          <ul className={styles.plainList}>
            {outcomes.per_table.map((table) => (
              <li key={table.index}>
                <span className={styles.plainRow}>
                  <span>Table {table.index}</span>
                  <span className={styles.plainValue}>{table.mutual}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
