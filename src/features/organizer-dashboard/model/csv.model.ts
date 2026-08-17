/**
 * Attendee rows as a spreadsheet.
 *
 * Hand-rolled rather than a dependency: seven columns, and the only hard part
 * is quoting, which is eight lines. Company names with commas in them are the
 * common case here, not an edge case.
 */

import type { AttendeeRow } from "../schemas/dashboard.schema";

const HEADER = "name,email,phone,company,checked_in,submitted_at,goal";

function field(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

/**
 * A download name the operating system will accept.
 *
 * Event names are typed by hand and routinely contain accents, slashes and
 * colons — a slash alone is enough to make the browser drop the name and save
 * the file as "download". Stripping to ASCII word characters is blunter than
 * necessary but leaves nothing that needs escaping downstream.
 */
export function csvFilename(eventName: string): string {
  const slug = eventName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "event"}-attendees.csv`;
}

export function toCsv(rows: AttendeeRow[]): string {
  const lines = rows.map((row) =>
    [
      field(row.display_name),
      field(row.email),
      field(row.phone),
      field(row.answers.company),
      field(row.checked_in),
      field(row.submitted_at),
      field(row.answers.t1),
    ].join(","),
  );
  return [HEADER, ...lines].join("\n");
}
