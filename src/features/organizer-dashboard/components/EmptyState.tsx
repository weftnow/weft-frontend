import styles from "./Dashboard.module.css";

/**
 * The state an organizer sees most often.
 *
 * Every event starts empty and stays that way until the first guest answers, so
 * "no data yet" is not an edge case on this dashboard — it is the opening
 * screen. Each one says what will fill the space and what makes that happen,
 * rather than reporting an absence.
 */
export function EmptyState({
  icon,
  title,
  body,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className={styles.empty}>
      {icon ? (
        <span aria-hidden className={styles.emptyMark}>
          {icon}
        </span>
      ) : null}
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyBody}>{body}</p>
    </div>
  );
}
