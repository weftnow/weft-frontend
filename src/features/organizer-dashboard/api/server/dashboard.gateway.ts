/**
 * The only module that calls weft_core with an organizer's Bearer token.
 *
 * Mirrors organizerAuth.gateway.ts: the session cookie is httpOnly and never
 * leaves the server, so every dashboard read goes browser -> our route handler
 * -> here -> backend. Upstream statuses are mapped to outcomes the UI can act
 * on, and 402 is kept distinct from 403 because one means "pay" and the other
 * means "not yours".
 */

const REQUEST_TIMEOUT_MS = 8_000;

export type DashboardOutcome<T> =
  | { status: "ok"; data: T }
  | { status: "unauthorized" }
  | { status: "planRequired" }
  | { status: "notFound" }
  // The event locked between the page rendering and the save. Kept distinct
  // from "unavailable" for the same reason 402 is kept distinct from 403:
  // one means "we're down", this one means "you're too late", and telling an
  // organizer the wrong one sends them to refresh instead of to reload.
  | { status: "conflict" }
  // A rejection the organizer caused and can fix — today only a wrong current
  // password, which is the one thing on the settings screen the browser
  // cannot check before asking. Distinct from `unavailable` because that
  // sentence is "we're down", and this one is "that isn't your password".
  | { status: "badRequest"; code: string }
  | { status: "unavailable" };

function backendBaseUrl(): string | null {
  return process.env.WEFT_B2B_API_URL?.replace(/\/$/, "") ?? null;
}

export async function fetchFromBackend<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<DashboardOutcome<T>> {
  const base = backendBaseUrl();
  if (!base) {
    console.error("dashboard request failed", "configuration");
    return { status: "unavailable" };
  }

  let response: Response;
  try {
    response = await fetchImpl(`${base}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init?.headers ?? {}),
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    console.error("dashboard request failed", "network");
    return { status: "unavailable" };
  }

  if (response.status === 401 || response.status === 403) return { status: "unauthorized" };
  if (response.status === 402) return { status: "planRequired" };
  if (response.status === 404) return { status: "notFound" };
  if (response.status === 409) return { status: "conflict" };
  if (response.status === 400) {
    // The DomainError body is {detail, code}. A 400 without one is still the
    // organizer's request to fix, so it reports badRequest rather than
    // falling through to "we're down".
    const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
    return {
      status: "badRequest",
      code: typeof body?.code === "string" ? body.code : "unknown",
    };
  }
  if (!response.ok) {
    console.error("dashboard request failed", response.status);
    return { status: "unavailable" };
  }

  // 204: the request succeeded and there is nothing to say. Reading a body
  // here would throw and turn a successful save into "we're down".
  if (response.status === 204) return { status: "ok", data: null as T };

  try {
    return { status: "ok", data: (await response.json()) as T };
  } catch {
    console.error("dashboard request failed", "invalid-body");
    return { status: "unavailable" };
  }
}
