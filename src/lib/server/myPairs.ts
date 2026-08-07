import { isPairResult } from "@/lib/server/pair";
import { weftFetch } from "@/lib/server/weftApi";
import type { PairSummary } from "@/lib/weftTypes";

/**
 * What the matches page can be. `no_session` is deliberately not folded into
 * `not_found`: "you have not taken this yet" and "the thread you took is gone"
 * are different facts, and only the second is worth an apology.
 */
export type MyPairsOutcome =
  | { status: "ok"; pairs: PairSummary[] }
  | { status: "no_session" }
  | { status: "not_found" }
  | { status: "unavailable" };

/** Matches lib/server/pair.ts. Nothing near this cap is a real session id. */
const MAX_ID_LENGTH = 128;

export function isPairSummary(value: unknown): value is PairSummary {
  if (!isPairResult(value)) return false;
  return typeof (value as PairSummary).pair_id === "string";
}

/**
 * Every pair this session belongs to, on either side, newest first.
 *
 * The session id is passed in rather than read here: `readSessionId()` needs a
 * request context, and a helper that reached for one could not be unit-tested.
 * The page owns the cookie read.
 */
export async function loadMyPairs(
  sessionId: string | null,
  fetchImpl?: typeof fetch,
): Promise<MyPairsOutcome> {
  if (!sessionId || sessionId.length > MAX_ID_LENGTH) return { status: "no_session" };

  const result = await weftFetch<unknown>(
    `/api/session/${encodeURIComponent(sessionId)}/pairs`,
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
    console.error("weft_core returned an unrenderable pair list");
    return { status: "unavailable" };
  }

  return { status: "ok", pairs };
}
