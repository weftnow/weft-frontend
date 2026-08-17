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
