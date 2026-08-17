import {
  ASK_LABELS,
  OFFER_LABELS,
  type ChipLabel,
} from "../i18n/dashboard.messages";
import styles from "./Dashboard.module.css";

export type IntentCount = { value: string; count: number };
type Labels = Record<string, ChipLabel>;

/**
 * Horizontal bars, not a pie: eight categories is unreadable as slices, and the
 * labels are whole sentences ("Solve a problem, find a provider") that only fit
 * running alongside the bar.
 *
 * Each list is scaled to its own largest count rather than to a shared maximum.
 * The two lists answer different questions and have different vocabularies —
 * putting them on one scale would invite reading a tall ask against a short
 * offer as though the two were comparable.
 */
function BarList({
  title,
  rows,
  labels,
  language,
}: {
  title: string;
  rows: IntentCount[];
  labels: Labels;
  language: "en" | "es";
}) {
  const max = rows.reduce((highest, row) => Math.max(highest, row.count), 0);
  return (
    <section className={`${styles.card} ${styles.half}`}>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className={styles.caption}>No answers yet.</p>
      ) : (
        <ul className={styles.bars}>
          {rows.map((row) => (
            <li key={row.value}>
              <span className={styles.barLabel}>
                {labels[row.value]?.[language] ?? row.value}
              </span>
              <span className={styles.track}>
                <span
                  className={styles.fill}
                  style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                />
              </span>
              <span className={styles.scoreCount}>{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * What the room wanted, and what it could give.
 *
 * Two independent lists, never a single diverging chart: s4 and s5 do not share
 * a vocabulary — there are 8 ask values and 7 offer values, and the mapping
 * between them is the hand-authored matrix in the backend's matching params.
 * Pairing them visually would assert a correspondence that does not exist.
 */
export function IntentChart({
  asks,
  offers,
  language,
}: {
  asks: IntentCount[];
  offers: IntentCount[];
  language: "en" | "es";
}) {
  // A fragment, not a grid: the tab owns the one `.cardGrid` these two sit in,
  // so they share their gutters with every other card rather than inventing a
  // second set.
  return (
    <>
      <BarList
        title={language === "es" ? "Lo que la sala buscaba" : "What the room wanted"}
        rows={asks}
        labels={ASK_LABELS}
        language={language}
      />
      <BarList
        title={
          language === "es"
            ? "Lo que la sala podía aportar"
            : "What the room could offer"
        }
        rows={offers}
        labels={OFFER_LABELS}
        language={language}
      />
    </>
  );
}
