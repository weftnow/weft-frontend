"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lockEvent } from "../api/client/dashboard.client";
import styles from "./Dashboard.module.css";

/**
 * Closing the form and seating the room — the dashboard's only irreversible
 * action.
 *
 * Two steps, in place, rather than a modal. The backend's /lock transitions the
 * event and queues the partition with no minimum-response check of its own, so
 * a mis-click on an empty room leaves an organizer with a locked event, no
 * tables, and no way back. A modal would protect the same click, but this
 * decision is made from the numbers in the card above it — an overlay covers
 * exactly the information the organizer needs to make it.
 *
 * With nobody in the room the button is disabled outright rather than
 * confirmed: there is no reading of "seat 0 guests" that the organizer meant.
 */
export function LockRoomCard({
  eventId,
  submitted,
}: {
  eventId: string;
  submitted: number;
}) {
  const queryClient = useQueryClient();
  // Generated rather than hard-coded: the id is only unique by luck while
  // exactly one of these renders per page, and aria-describedby pointing at
  // the wrong element is worse than pointing at nothing.
  const whyId = useId();
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const lock = useMutation({
    mutationFn: () => lockEvent(eventId),
    onSuccess: () => {
      setConfirming(false);
      return queryClient.invalidateQueries({
        queryKey: ["organizer", "groups", eventId],
      });
    },
  });

  // Move focus onto the confirm button when the second step appears. Without
  // this a keyboard user's focus stays on a button that no longer exists and
  // falls back to the document, so the step they have to answer is the one
  // thing they cannot reach.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const empty = submitted === 0;

  // The lock is queued, not done — the partition runs on a worker and the room
  // map fills in over the next few polls. Offering the button again here would
  // suggest the matching can be re-run, so the card retires instead.
  if (lock.isSuccess) {
    return (
      <section className={`${styles.card} ${styles.minor}`}>
        <h2>Seating the room</h2>
        <p className={styles.caption}>
          The form is closed. Tables appear below as they are formed — this
          takes a moment.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`${styles.card} ${styles.minor}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && confirming) setConfirming(false);
      }}
    >
      <h2>Ready to seat the room?</h2>

      {empty ? (
        <p className={styles.caption} id={whyId}>
          Nobody has answered the form yet. Once your first guest does, you can
          close the form and seat the room.
        </p>
      ) : confirming ? (
        <p className={styles.caption} id={whyId}>
          This closes the form and seats the {submitted}{" "}
          {submitted === 1 ? "guest" : "guests"} who have answered. Nobody can
          join afterwards, and it cannot be undone.
        </p>
      ) : (
        <p className={styles.caption} id={whyId}>
          This closes the guest form and sorts everyone who answered into
          tables. It cannot be undone.
        </p>
      )}

      <div className={styles.actionRow}>
        {confirming ? (
          <>
            <button
              aria-describedby={whyId}
              className={styles.primary}
              disabled={lock.isPending}
              onClick={() => lock.mutate()}
              ref={confirmRef}
              type="button"
            >
              {lock.isPending ? "Forming groups…" : "Yes, form groups"}
            </button>
            <button
              className={styles.secondaryAction}
              disabled={lock.isPending}
              onClick={() => setConfirming(false)}
              type="button"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            aria-describedby={whyId}
            className={styles.primary}
            disabled={empty}
            onClick={() => setConfirming(true)}
            type="button"
          >
            Form groups now
          </button>
        )}
      </div>

      {lock.isError ? (
        <p className={`${styles.caption} ${styles.errorNote}`} role="alert">
          That did not go through. Nothing has changed — try again.
        </p>
      ) : null}
    </section>
  );
}
