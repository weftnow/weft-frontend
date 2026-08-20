import type { GroupView } from "../../components/RoomMap";
import type { EventCreateBody, EventSummaryRow, EventUpdateBody } from "../../schemas/dashboard.schema";
import type {
  OrganizerMe,
  PasswordChangeBody,
  SettingsUpdateBody,
} from "@/features/organizer-settings/schemas/settings.schema";

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
  constructor(
    readonly code:
      | "unauthorized"
      | "planRequired"
      | "unavailable"
      | "conflict"
      // The only settings rejection the browser cannot pre-check: whether the
      // current password is right is something only the server knows.
      | "invalidPassword",
  ) {
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
  // An event that locked while the edit form was open. The organizer did
  // nothing wrong and needs a different sentence from "we're down".
  if (response.status === 409) throw new DashboardClientError("conflict");
  if (response.status === 400) {
    const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
    throw new DashboardClientError(
      body?.code === "invalid_password" ? "invalidPassword" : "unavailable",
    );
  }
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
 * Arm the countdown. Every guest's phone shows their table five seconds later.
 *
 * Irreversible on the backend by design, so the card that calls this asks
 * twice before it does.
 */
export function revealEvent(eventId: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/organizer/events/${eventId}/reveal`, {
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

/**
 * Edit an event that has not locked yet.
 *
 * Same error story as createEvent: eventUpdateSchema applies the backend's own
 * rules first, so anything the backend still rejects is our drift, not the
 * organizer's mistake. The one exception is a 409 — the event locked between
 * the page rendering and the save, which is a real thing that happens and is
 * handled by the form, not by this layer.
 */
export function updateEvent(
  eventId: string,
  body: EventUpdateBody,
): Promise<EventSummaryRow> {
  return request<EventSummaryRow>(`/api/organizer/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Save the profile and defaults.
 *
 * No `validation` error code, for the same reason createEvent has none:
 * settingsUpdateSchema applies the backend's own rules in the browser first,
 * so a rejection that gets this far means the two copies have drifted — our
 * bug, not a sentence to show the organizer.
 */
export function updateSettings(body: SettingsUpdateBody): Promise<OrganizerMe> {
  return request<OrganizerMe>("/api/organizer/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Change the password. The one call here that can fail for a reason the
 * organizer caused and can fix, hence `invalidPassword` above.
 */
export async function changePassword(body: PasswordChangeBody): Promise<void> {
  await request<null>("/api/organizer/settings/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
