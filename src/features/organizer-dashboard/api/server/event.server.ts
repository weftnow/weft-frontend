import { cache } from "react";
import { fetchFromBackend, type DashboardOutcome } from "./dashboard.gateway";

/**
 * One event fetch per render, however many components ask for it.
 *
 * The layout needs the event to draw the header and every tab page needs it
 * for its own reasons, so without this the same /v1/events/{id} request goes
 * out two or three times on a single page load. React's cache() memoises for
 * the lifetime of one request, which is exactly the scope we want: fresh on
 * every navigation, shared within a render.
 *
 * Deliberately untested at the unit level — cache() only memoises inside a
 * React request scope, so a bun test calling it twice would re-run the fetch
 * and prove nothing either way. The dedupe is verified in the browser.
 */
export const loadEvent = cache(
  async (eventId: string, token: string): Promise<DashboardOutcome<unknown>> =>
    fetchFromBackend<unknown>(`/v1/events/${eventId}`, token),
);

/** Same reasoning as loadEvent — every tab page reads the summary for `plan`. */
export const loadSummary = cache(
  async (eventId: string, token: string): Promise<DashboardOutcome<unknown>> =>
    fetchFromBackend<unknown>(`/v1/events/${eventId}/summary`, token),
);
