/**
 * The only module that knows how to reach weft_core. Server-side use only.
 *
 * Route handlers call this and map the result; nothing else reads WEFT_API_URL
 * or the proxy key, so the backend's address and secret have exactly one home.
 *
 * Why no `import "server-only"` guard: that is a separate package and this
 * phase adds no dependencies. The secret cannot reach the browser regardless --
 * Next.js only inlines env vars prefixed NEXT_PUBLIC_, so these read as
 * undefined in any client bundle. Adding `server-only` later would upgrade an
 * accidental client import from "silently broken" to "build error", which is
 * worth doing if this module ever grows.
 */

const TIMEOUT_MS = 8000;

export type WeftErrorCode =
  | "validation"
  | "not_found"
  | "expired"
  | "unauthorized"
  | "unavailable";

export type WeftResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: WeftErrorCode; message: string };

const GENERIC_FAILURE = "The service is unavailable right now. Please try again.";

/** Upstream status -> what it means for the person using the site. */
export function mapUpstreamStatus(status: number): WeftErrorCode {
  if (status === 400) return "validation";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 410) return "expired";
  return "unavailable";
}

function failure(status: number, message: string): WeftResult<never> {
  return { ok: false, status, code: mapUpstreamStatus(status), message };
}

export async function weftFetch<T>(
  path: string,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<WeftResult<T>> {
  const base = process.env.WEFT_API_URL;
  if (!base) {
    // Misconfiguration, not a user error -- say nothing specific to the client.
    console.error("WEFT_API_URL is not set; cannot reach the backend");
    return failure(503, GENERIC_FAILURE);
  }

  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const key = process.env.WEFT_PROXY_KEY;
  if (key) headers.set("X-Weft-Proxy-Key", key);

  let response: Response;
  try {
    response = await fetchImpl(`${base}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (reason) {
    // Timeouts and refused connections carry host details -- log, never return.
    console.error("weft_core request failed", reason);
    return failure(503, GENERIC_FAILURE);
  }

  if (!response.ok) {
    const code = mapUpstreamStatus(response.status);
    // A 400 is written for the person who typed it; anything else is internal.
    let message = GENERIC_FAILURE;
    if (code === "validation" || code === "not_found" || code === "expired") {
      const body = await response.json().catch(() => null);
      const detail = (body as { detail?: unknown } | null)?.detail;
      if (typeof detail === "string") message = detail;
    }
    if (code === "unavailable" || code === "unauthorized") {
      console.error("weft_core returned", response.status);
    }
    return { ok: false, status: response.status, code, message };
  }

  const data = (await response.json()) as T;
  return { ok: true, data };
}
