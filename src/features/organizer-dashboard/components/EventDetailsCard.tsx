"use client";

import { useState } from "react";
import type { EventSummaryRow } from "../schemas/dashboard.schema";
import { CreateEventForm } from "./CreateEventForm";
import styles from "./Dashboard.module.css";

/**
 * What the organizer typed, and the way back in to change it.
 *
 * A client component rather than markup in overview/page.tsx because that page
 * is an async server component and this needs the toggle state. Editing is
 * revealed inline rather than routed to /edit, matching how /organizer already
 * reveals the create form.
 *
 * `editable` is decided by the caller from the event's state, not here: once an
 * event locks the backend answers 409, and offering a button that cannot work
 * is worse than offering none. CreateEventForm still handles the 409 for the
 * case where the event locks while this page sits open.
 */
export function EventDetailsCard({
  event,
  editable,
}: {
  event: EventSummaryRow;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <section className={`${styles.card} ${styles.wide}`}>
        <CreateEventForm
          event={event}
          heading="Edit event"
          mode="edit"
          onCreated={() => window.location.reload()}
        />
        <button
          className={styles.secondaryAction}
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
      </section>
    );
  }

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
      {editable ? (
        <button
          className={styles.secondaryAction}
          onClick={() => setEditing(true)}
          type="button"
        >
          Edit event
        </button>
      ) : null}
    </section>
  );
}
