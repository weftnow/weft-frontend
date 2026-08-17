import type { EventSummaryRow } from "../schemas/dashboard.schema";
import styles from "./Dashboard.module.css";

/**
 * What the organizer typed, read back to them.
 *
 * This used to hold the way in to changing it too — a button that swapped the
 * card's contents for the whole two-pane CreateEventForm, inside one column of
 * a grid, with the rest of the tab still on screen around it. Editing now has
 * a screen of its own and one entry point, in the event header, so the card is
 * only what it displays. No state left, so no "use client" either.
 */
export function EventDetailsCard({ event }: { event: EventSummaryRow }) {
  return (
    <section className={`${styles.card} ${styles.wide}`}>
      <h2>Event details</h2>
      {event.description ? (
        <p className={styles.caption}>{event.description}</p>
      ) : null}
      <p className={styles.caption}>
        {/* "Unlimited" is real information about how the room is run, not an
            empty state — so it prints rather than being hidden. */}
        {event.capacity ? `${event.capacity} seats` : "Unlimited seats"}
      </p>
    </section>
  );
}
