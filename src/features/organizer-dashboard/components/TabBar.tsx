import Link from "next/link";
import type { DashboardTab } from "../model/eventState.model";
import { LockIcon } from "./icons";
import styles from "./Dashboard.module.css";

const TABS: { key: DashboardTab; label: string; paid: boolean }[] = [
  { key: "overview", label: "Overview", paid: false },
  { key: "live", label: "Live", paid: false },
  { key: "attendees", label: "Attendees", paid: true },
  { key: "groups", label: "Groups", paid: true },
  { key: "outcomes", label: "Outcomes", paid: true },
];

/**
 * Paid tabs are rendered for free organizers rather than hidden. A visibly
 * locked tab is the upgrade prompt — hiding them means a free organizer never
 * learns the paid product exists.
 *
 * A locked tab is a `<span>` carrying a padlock rather than a greyed link:
 * greying alone is a colour signal a dim room and a colour-blind organizer
 * both lose, and the padlock says "not yours yet" where a dead link says
 * "broken".
 */
export function TabBar({
  eventId,
  active,
  plan,
}: {
  eventId: string;
  active: DashboardTab;
  plan: "free" | "pro";
}) {
  return (
    <nav aria-label="Event sections" className={styles.tabBar}>
      {TABS.map((tab) => {
        const locked = tab.paid && plan === "free";
        return locked ? (
          <span
            aria-disabled="true"
            className={styles.tab}
            data-locked="true"
            key={tab.key}
          >
            <LockIcon />
            {tab.label}
          </span>
        ) : (
          <Link
            aria-current={tab.key === active ? "page" : undefined}
            className={styles.tab}
            href={`/organizer/events/${eventId}/${tab.key}`}
            key={tab.key}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
