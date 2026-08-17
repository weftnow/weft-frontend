"use client";

import { csvFilename, toCsv } from "../model/csv.model";
import type { AttendeeRow } from "../schemas/dashboard.schema";
import styles from "./Dashboard.module.css";

/**
 * The export.
 *
 * A client component holding rows the server already sent, rather than a
 * download endpoint: the table on screen is the same data, so a second round
 * trip would only be a chance for the two to disagree. Building the file in the
 * browser also means the organizer's contact list is never handed to a third
 * party on its way out.
 *
 * The object URL is revoked immediately — the click has already been
 * dispatched by then, and leaving it alive pins the whole CSV in memory for the
 * lifetime of the document.
 */
export function ExportCsvButton({
  rows,
  eventName,
}: {
  rows: AttendeeRow[];
  eventName: string;
}) {
  function download() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = csvFilename(eventName);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.toolbar}>
      <button type="button" onClick={download} disabled={rows.length === 0}>
        Export CSV
      </button>
    </div>
  );
}
