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
  if (!response.ok) {
    console.error("dashboard request failed", response.status);
    return { status: "unavailable" };
  }

  try {
    return { status: "ok", data: (await response.json()) as T };
  } catch {
    console.error("dashboard request failed", "invalid-body");
    return { status: "unavailable" };
  }
}
