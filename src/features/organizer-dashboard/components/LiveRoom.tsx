"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGroups } from "../api/client/dashboard.client";
import { LockRoomCard } from "./LockRoomCard";
import { RoomMap } from "./RoomMap";
import { StatTiles } from "./StatTiles";
import styles from "./Dashboard.module.css";

const POLL_MS = 10_000;

/**
 * The night, while it is happening.
 *
 * Polling rather than a socket: the host's phone is one client, the numbers
 * move on the scale of a person walking to a table, and ten seconds of lag is
 * invisible in a room. A websocket here would be infrastructure bought to shave
 * latency nobody can perceive.
 *
 * This is the one tab read standing up, at arm's length, in bad light — so the
 * counts lead in ember and the seat dots carry the only motion on the surface:
 * a dot fills when the poll lands rather than flicking, which is what makes a
 * change across the room legible from the corner of the eye.
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
  const groups = useQuery({
    queryKey: ["organizer", "groups", eventId],
    queryFn: () => fetchGroups(eventId),
    refetchInterval: POLL_MS,
  });

  const rows = groups.data ?? [];
  const seats = rows.flatMap((group) => group.members);
  const confirmed = seats.filter((member) => member.confirmed).length;

  return (
    <>
      {partitionError ? (
        <section
          className={`${styles.card} ${styles.wide} ${styles.alert}`}
          role="alert"
        >
          <h2>Matching failed</h2>
          <p>{partitionError}</p>
        </section>
      ) : null}

      {/* Narrows to make room for the lock action only while that action
          exists. An event past "open" has nothing to decide, so the counts
          take the whole row rather than leaving a hole beside them. */}
      <section className={`${styles.card} ${canLock ? styles.major : styles.wide}`}>
        <h2>The night so far</h2>
        <StatTiles
          lead
          stats={[
            { value: checkedIn, of: submitted, label: "Checked in" },
            { value: confirmed, of: seats.length, label: "Found their table" },
            { value: rows.length, label: "Tables" },
          ]}
        />
      </section>

      {canLock ? <LockRoomCard eventId={eventId} submitted={submitted} /> : null}

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
    </>
  );
}
