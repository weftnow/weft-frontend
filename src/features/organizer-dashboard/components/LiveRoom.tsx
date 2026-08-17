"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGroups, lockEvent } from "../api/client/dashboard.client";
import { RoomMap } from "./RoomMap";
import styles from "./Dashboard.module.css";

const POLL_MS = 10_000;

/**
 * The night, while it is happening.
 *
 * Polling rather than a socket: the host's phone is one client, the numbers
 * move on the scale of a person walking to a table, and ten seconds of lag is
 * invisible in a room. A websocket here would be infrastructure bought to shave
 * latency nobody can perceive.
 */
export function LiveRoom({
  eventId,
  checkedIn,
  submitted,
  canLock,
  partitionError,
}: {
  eventId: string;
  checkedIn: number;
  submitted: number;
  canLock: boolean;
  partitionError: string | null;
}) {
  const queryClient = useQueryClient();

  const groups = useQuery({
    queryKey: ["organizer", "groups", eventId],
    queryFn: () => fetchGroups(eventId),
    refetchInterval: POLL_MS,
  });

  const lock = useMutation({
    mutationFn: () => lockEvent(eventId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["organizer", "groups", eventId] }),
  });

  const rows = groups.data ?? [];
  const seats = rows.flatMap((group) => group.members);
  const confirmed = seats.filter((member) => member.confirmed).length;

  return (
    <div className={styles.cardGrid}>
      {partitionError ? (
        <section
          className={`${styles.card} ${styles.wide} ${styles.alert}`}
          role="alert"
        >
          <h2>Matching failed</h2>
          <p>{partitionError}</p>
        </section>
      ) : null}

      <section className={styles.card}>
        <h2>Checked in</h2>
        <p className={styles.hero}>
          {checkedIn} <span className={styles.of}>/ {submitted}</span>
        </p>
      </section>

      <section className={styles.card}>
        <h2>Found their table</h2>
        <p className={styles.hero}>
          {confirmed} <span className={styles.of}>/ {seats.length}</span>
        </p>
      </section>

      <section className={`${styles.card} ${styles.wide}`}>
        <h2>The room</h2>
        {groups.isError ? (
          // The poll keeps running underneath this, so the message says so
          // rather than offering a retry button that duplicates what is
          // already happening every ten seconds.
          <p className={styles.caption}>Could not load the room. Retrying…</p>
        ) : (
          <RoomMap groups={rows} />
        )}
      </section>

      {canLock ? (
        <section className={`${styles.card} ${styles.wide}`}>
          <button type="button" onClick={() => lock.mutate()} disabled={lock.isPending}>
            {lock.isPending ? "Forming groups…" : "Form groups now"}
          </button>
          {lock.isError ? (
            <p className={styles.caption}>That did not work. Try again.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
