import styles from "./Dashboard.module.css";

export type GroupMemberView = { display_name: string | null; confirmed: boolean };
export type GroupView = {
  index: number;
  colour: string;
  members: GroupMemberView[];
};

/**
 * The room, as seen from the host's phone.
 *
 * One dot per seat, filled when that person has tapped "I found my group". A
 * free organizer gets the shape of the room without a single name — the same
 * component serves the paid Groups tab, where display_name arrives populated,
 * so the two tiers are one component with one code path rather than two views
 * that can drift apart.
 */
export function RoomMap({ groups }: { groups: GroupView[] }) {
  if (groups.length === 0) {
    return (
      <section className={styles.card}>
        <h2>No tables yet</h2>
        <p className={styles.caption}>Tables appear here once groups are formed.</p>
      </section>
    );
  }

  return (
    <ul className={styles.roomMap}>
      {groups.map((group) => (
        <li key={group.index} className={styles.tableCard} data-colour={group.colour}>
          <ol className={styles.seats}>
            {group.members.map((member, seat) => (
              <li
                key={member.display_name ?? seat}
                className={styles.seat}
                data-confirmed={String(member.confirmed)}
              >
                <span className={styles.dot} aria-hidden="true" />
                {member.display_name ? (
                  <span className={styles.seatName}>{member.display_name}</span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className={styles.tableIndex}>Table {group.index}</p>
        </li>
      ))}
    </ul>
  );
}
