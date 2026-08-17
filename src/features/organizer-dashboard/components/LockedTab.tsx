import { LockIcon } from "./icons";
import styles from "./Dashboard.module.css";

const FEATURES = {
  attendees: {
    title: "Attendee details are part of the paid plan",
    body: "Names, companies, contact details, what each person came to do, and a CSV export.",
  },
  groups: {
    title: "Table details are part of the paid plan",
    body: "Who sat at each table, and who has not found their group yet.",
  },
  outcomes: {
    title: "Outcomes are part of the paid plan",
    body: "Mutual reconnects, who wanted to meet again, and results per table.",
  },
} as const;

/**
 * Deliberately not a blurred preview. Blurring implies the data reached the
 * browser and is merely hidden — here it was never sent, and the placeholder
 * should not suggest otherwise.
 *
 * Warm rather than grey, for the same reason: this is an invitation, and a
 * disabled-looking panel reads as something broken rather than something
 * available.
 */
export function LockedTab({ feature }: { feature: keyof typeof FEATURES }) {
  const copy = FEATURES[feature];
  return (
    <div className={styles.locked}>
      <span className={styles.lockedBadge}>
        <LockIcon />
        Paid plan
      </span>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
    </div>
  );
}
