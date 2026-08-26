import type { AttendeeRow } from "../schemas/dashboard.schema";
import { EmptyState } from "./EmptyState";
import { SendLinkCell } from "./SendLinkCell";
import { CheckIcon, UsersIcon } from "./icons";
import styles from "./Dashboard.module.css";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * The directory.
 *
 * Each person's T1 answer — what they came to accomplish — is rendered under
 * their name rather than behind a click. It is the most human field in the
 * database and the reason an organizer feels they know their room; burying it
 * turns the page into a contact export.
 *
 * Whether someone checked in is a tick plus dimmed row, never dimming alone:
 * the difference has to be readable in a badly-lit venue on a phone, and it is
 * the column an organizer scans this table for.
 */
export function AttendeeTable({ rows }: { rows: AttendeeRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        body="Share the guest link from the Overview tab and answers land here as they arrive."
        icon={<UsersIcon />}
        title="No responses yet"
      />
    );
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Company</th>
            <th scope="col">Email</th>
            <th scope="col">Phone</th>
            <th scope="col">Checked in</th>
            <th scope="col">Send</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              data-checked-in={String(row.checked_in)}
              key={`${row.display_name}-${row.submitted_at}`}
            >
              <th scope="row">
                <span className={styles.personName}>{row.display_name}</span>
                {text(row.answers.t1) ? (
                  <span className={styles.personGoal}>{text(row.answers.t1)}</span>
                ) : null}
              </th>
              <td>{text(row.answers.company) ?? "—"}</td>
              <td>{row.email ?? "—"}</td>
              <td>{row.phone ?? "—"}</td>
              <td>
                {row.checked_in ? (
                  <span className={styles.tick}>
                    <CheckIcon />
                    Yes
                  </span>
                ) : (
                  "No"
                )}
              </td>
              <td>
                <SendLinkCell linkToken={row.link_token} phone={row.phone} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
