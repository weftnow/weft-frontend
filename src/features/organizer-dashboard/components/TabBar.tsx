import Link from "next/link";
import type { DashboardTab } from "../model/eventState.model";

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
    <nav aria-label="Event sections">
      {TABS.map((tab) => {
        const locked = tab.paid && plan === "free";
        return locked ? (
          <span key={tab.key} data-locked="true" aria-disabled="true">
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.key}
            href={`/organizer/events/${eventId}/${tab.key}`}
            aria-current={tab.key === active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
