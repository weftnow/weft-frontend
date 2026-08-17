import { EmptyState } from "./EmptyState";
import { UsersIcon } from "./icons";
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
 *
 * Returns the map itself, not a card. Live renders it under the counts inside
 * one card and Groups gives it a card of its own; a wrapper baked in here
 * would nest a card inside a card on the Live tab.
 */
export function RoomMap({ groups }: { groups: GroupView[] }) {
  if (groups.length === 0) {
    return (
      <EmptyState
        body="Tables appear here the moment you form groups."
        icon={<UsersIcon />}
        title="No tables yet"
      />
    );
  }

  return (
    <ul className={styles.roomMap}>
      {groups.map((group) => (
        <li className={styles.tableCard} data-colour={group.colour} key={group.index}>
          <ol className={styles.seats}>
            {group.members.map((member, seat) => (
              <li
                className={styles.seat}
                data-confirmed={String(member.confirmed)}
                key={member.display_name ?? seat}
              >
                <span aria-hidden="true" className={styles.dot} />
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
