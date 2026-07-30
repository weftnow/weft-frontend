import { isPairSummary } from "@/lib/server/myPairs";
import { weftFetch } from "@/lib/server/weftApi";
import type { PairSummary } from "@/lib/weftTypes";

/**
 * What the sender's thread page can be. An empty list is `ok`, not an error:
 * "nobody has answered yet" is the expected state for a link saved the moment
 * it was created.
 */
export type ThreadOutcome =
  | { status: "ok"; pairs: PairSummary[] }
  | { status: "not_found" }
  | { status: "unavailable" };

/** Matches lib/server/pair.ts. Nothing near this cap is a real token. */
const MAX_TOKEN_LENGTH = 128;

/**
 * Every pair one invitation produced, newest first. The token is passed in
 * rather than read here: the page owns the params read, which keeps this
 * unit-testable without a request context.
 */
export async function loadThread(
  returnToken: string | null,
  fetchImpl?: typeof fetch,
): Promise<ThreadOutcome> {
  if (!returnToken || returnToken.length > MAX_TOKEN_LENGTH) return { status: "not_found" };

  const result = await weftFetch<unknown>(
    `/api/thread/${encodeURIComponent(returnToken)}`,
    { method: "GET" },
    fetchImpl,
  );

  if (!result.ok) {
    if (result.code === "not_found") return { status: "not_found" };
    // Including `unauthorized`: a rejected proxy key is our misconfiguration,
    // and the visitor can do nothing with that information.
    return { status: "unavailable" };
  }

  const pairs = (result.data as { pairs?: unknown } | null)?.pairs;
  if (!Array.isArray(pairs) || !pairs.every(isPairSummary)) {
    console.error("weft_core returned an unrenderable thread");
    return { status: "unavailable" };
  }

  return { status: "ok", pairs };
}
