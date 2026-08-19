/**
 * Which face the dashboard shows.
 *
 * The organizer opens the same URL before, during and after the night, so the
 * page does not change — the tab it lands on does. Keeping that decision here
 * rather than in the route keeps it testable and keeps the rule in one place.
 */

export type EventState =
  | "open"
  | "locked"
  | "published"
  | "live"
  | "closed"
  | "learned";

export type DashboardTab =
  | "overview"
  | "live"
  | "attendees"
  | "groups"
  | "outcomes";

const RUNNING: ReadonlySet<EventState> = new Set(["locked", "published", "live"]);

export function landingTab(state: EventState): DashboardTab {
  return RUNNING.has(state) ? "live" : "overview";
}

/**
 * Whether the guest questionnaire is still open, and so whether there is any
 * point showing the organizer a link to it.
 *
 * Only "open" qualifies. Locking is what closes the form — everything after it
 * has either been matched already or is over, and an invitation to a room that
 * has stopped admitting people is worse than no invitation at all.
 */
export function acceptsResponses(state: EventState): boolean {
  return state === "open";
}

export type ReadinessStep = { key: string; done: boolean };

// The night is over and the tables are public. "published" is deliberately
// absent: the backend transitions published -> live on reveal
// (app/services/events.py), so a published event has been matched but nobody
// has seen their table yet.
const REVEALED: ReadonlySet<EventState> = new Set(["live", "closed", "learned"]);

export function readiness(
  summary: { submitted: number; groups: number },
  state: EventState,
): ReadinessStep[] {
  return [
    // The form exists the moment the event does — this step is always done,
    // and it is here because a checklist whose first item is already ticked
    // reads as progress rather than as an empty list.
    { key: "form", done: true },
    { key: "responses", done: summary.submitted > 0 },
    { key: "matched", done: summary.groups > 0 },
    { key: "revealed", done: REVEALED.has(state) },
  ];
}

/**
 * Whether to offer the host the reveal.
 *
 * Gated on tables existing rather than on the state alone, because the state
 * the page rendered with goes stale the moment the partition worker finishes:
 * the host would be left looking at a screen that never grows the button.
 * The room map polls, and the backend writes the groups and the published
 * state in one transaction (app/services/matching_runner.py), so a map with
 * tables in it is proof the event is past matching and /reveal will be
 * accepted.
 */
export function revealable(state: EventState, tablesExist: boolean): boolean {
  return tablesExist && !REVEALED.has(state);
}

const TABS: ReadonlySet<string> = new Set([
  "overview",
  "live",
  "attendees",
  "groups",
  "outcomes",
]);

/**
 * Which tab a URL is showing.
 *
 * The tab bar moved out of the five pages and into the layout so that a click
 * highlights immediately and survives the loading state — and a layout cannot
 * be told which child segment rendered, so the path is what it reads instead.
 *
 * Falls back to overview rather than to nothing: the bare event URL redirects
 * to a tab, and a bar with no tab marked during that instant reads as broken.
 */
export function activeTabFor(pathname: string): DashboardTab {
  const last = pathname.split("/").filter(Boolean).at(-1) ?? "";
  return TABS.has(last) ? (last as DashboardTab) : "overview";
}
