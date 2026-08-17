import type { AttendeeRow } from "../schemas/dashboard.schema";
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
 */
export function AttendeeTable({ rows }: { rows: AttendeeRow[] }) {
  if (rows.length === 0) {
    return <p className={styles.caption}>No responses yet.</p>;
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
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.display_name}-${row.submitted_at}`}
              data-checked-in={String(row.checked_in)}
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
              <td>{row.checked_in ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
