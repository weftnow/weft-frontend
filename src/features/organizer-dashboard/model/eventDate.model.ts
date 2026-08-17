const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * The event's date, for the line under its name.
 *
 * Formatted from the ISO string's own calendar fields rather than through
 * `Date` and `toLocaleDateString`. Two reasons, and they point the same way:
 *
 * - `Date` would reinterpret the timestamp in whichever timezone the render
 *   happens to run in, so a 21 August 19:00 event in Bogotá renders as
 *   22 August on a UTC server. The organizer set a date; that date is what we
 *   show back.
 * - `toLocaleDateString` reads the host locale, which differs between the
 *   server that renders this and the browser that receives it.
 *
 * Anything that is not a plain `YYYY-MM-DD…` prefix returns null, and the
 * caller drops the date rather than printing "Invalid Date".
 */
export function formatEventDate(startsAt: string | null): string | null {
  if (!startsAt) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(startsAt);
  if (!match) return null;

  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  if (!name) return null;

  return `${Number(day)} ${name} ${year}`;
}
