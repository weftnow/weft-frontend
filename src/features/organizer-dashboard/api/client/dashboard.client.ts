import type { GroupView } from "../../components/RoomMap";
import type { EventCreateBody, EventSummaryRow } from "../../schemas/dashboard.schema";

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Browser-side reads, aimed at our own route handlers rather than the backend.
 *
 * The organizer's token lives in an httpOnly cookie, so the browser cannot call
 * weft_core itself — these paths are all /api/organizer/*, and the handler on
 * the other end attaches the token. The status codes it returns are the ones
 * mapped here.
 */
export class DashboardClientError extends Error {
  constructor(readonly code: "unauthorized" | "planRequired" | "unavailable") {
    super(code);
    this.name = "DashboardClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // A timeout and a dropped connection are the same thing to the host
    // watching the screen: the number stopped moving. Both become "unavailable"
    // so the UI has one retry story rather than two.
    throw new DashboardClientError("unavailable");
  }

  if (response.status === 401) throw new DashboardClientError("unauthorized");
  if (response.status === 402) throw new DashboardClientError("planRequired");
  if (!response.ok) throw new DashboardClientError("unavailable");

  return (await response.json()) as T;
}

export function fetchGroups(eventId: string): Promise<GroupView[]> {
  return request<GroupView[]>(`/api/organizer/events/${eventId}/groups`);
}

export function lockEvent(eventId: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/organizer/events/${eventId}/lock`, {
    method: "POST",
  });
}

/**
 * Create an event and get it back, form token and all.
 *
 * No `validation` error code, deliberately. eventCreateSchema applies the same
 * rules the backend does before this is ever called, so a rejection that gets
 * this far means the two have drifted — our bug, not something to explain to
 * the organizer in a message of its own. It joins the "unavailable" story.
 */
export function createEvent(body: EventCreateBody): Promise<EventSummaryRow> {
  return request<EventSummaryRow>("/api/organizer/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
