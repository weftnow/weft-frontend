"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revealEvent } from "../api/client/dashboard.client";
import styles from "./Dashboard.module.css";

/**
 * The host's moment — and the second of the dashboard's two irreversible
 * actions.
 *
 * Two steps in place, for the same reason LockRoomCard uses them: the backend
 * has no un-reveal, and once fifty people have seen a colour, taking it back is
 * worse than living with the partition you have. A modal would cover the room
 * map, which is the thing the host is reading to decide whether the room is
 * ready.
 *
 * There is no empty-room guard here. This card only renders once tables exist
 * (see revealable in ../model/eventState.model), so by the time it is on screen
 * there is always somebody to reveal to.
 */
export function RevealTablesCard({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const whyId = useId();
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const reveal = useMutation({
    mutationFn: () => revealEvent(eventId),
    onSuccess: () => {
      setConfirming(false);
      // "Found their table" starts moving the moment the tables are out, and
      // that number is the whole reason the host is watching this screen.
      return queryClient.invalidateQueries({
        queryKey: ["organizer", "groups", eventId],
      });
    },
  });

  // Same reason as the lock card: without this, a keyboard user's focus is
  // left on a button that no longer exists.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  if (reveal.isSuccess) {
    return (
      <section className={`${styles.card} ${styles.minor}`}>
        <h2>The tables are out</h2>
        <p className={styles.caption}>
          Guests are seeing their group now. Watch “Found their table” climb as
          the room settles.
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
      <h2>Ready to reveal the tables?</h2>

      {confirming ? (
        <p className={styles.caption} id={whyId}>
          Every guest sees their table about five seconds after you confirm. It
          cannot be undone.
        </p>
      ) : (
        <p className={styles.caption} id={whyId}>
          This shows every guest their table. It cannot be undone.
        </p>
      )}

      <div className={styles.actionRow}>
        {confirming ? (
          <>
            <button
              aria-describedby={whyId}
              className={styles.primary}
              disabled={reveal.isPending}
              onClick={() => reveal.mutate()}
              ref={confirmRef}
              type="button"
            >
              {reveal.isPending ? "Revealing…" : "Yes, reveal"}
            </button>
            <button
              className={styles.secondaryAction}
              disabled={reveal.isPending}
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
            onClick={() => setConfirming(true)}
            type="button"
          >
            Reveal the tables
          </button>
        )}
      </div>

      {reveal.isError ? (
        <p className={`${styles.caption} ${styles.errorNote}`} role="alert">
          That did not go through. Nothing has changed — try again.
        </p>
      ) : null}
    </section>
  );
}
