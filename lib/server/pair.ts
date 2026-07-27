import { weftFetch } from "@/lib/server/weftApi";
import type { PairPerson, PairResult, ValueEntry } from "@/lib/weftTypes";

export type PairOutcome =
  | { status: "ok"; result: PairResult }
  | { status: "not_found" }
  | { status: "unavailable" };

const MAX_ID_LENGTH = 128;

function isValueEntry(value: unknown): value is ValueEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<ValueEntry>;
  return (
    typeof v.key === "string" &&
    typeof v.name === "string" &&
    typeof v.tagline === "string" &&
    typeof v.blurb === "string"
  );
}

function isPairPerson(value: unknown): value is PairPerson {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<PairPerson>;
  return (
    typeof p.name === "string" &&
    Array.isArray(p.top_values) &&
    p.top_values.every(isValueEntry) &&
    typeof p.humour === "string" &&
    typeof p.opens_up === "string" &&
    typeof p.pace === "string" &&
    typeof p.life_stage === "string"
  );
}

/**
 * `people` is exactly two, in the backend's order: the sender first, the
 * responder second. Nothing in the payload identifies which of them is
 * reading it, which is why the UI names both rather than saying "you".
 * `shared_values` is allowed to be empty -- two people with nothing in
 * common is a result, not a malformed response.
 */
export function isPairResult(value: unknown): value is PairResult {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<PairResult>;
  return (
    typeof p.headline === "string" &&
    // NaN and Infinity would both survive `typeof` and then paint a meter of
    // no width, so the finite check is the one that matters here.
    typeof p.score === "number" &&
    Number.isFinite(p.score) &&
    typeof p.percent === "number" &&
    Number.isInteger(p.percent) &&
    p.percent >= 0 &&
    p.percent <= 100 &&
    typeof p.band === "string" &&
    Array.isArray(p.shared_values) &&
    p.shared_values.every(isValueEntry) &&
    typeof p.difference === "string" &&
    Array.isArray(p.people) &&
    p.people.length === 2 &&
    p.people.every(isPairPerson)
  );
}

/**
 * The friend-safe compatibility result: the pair's own score plus the words
 * that explain it -- never the channel breakdown behind it, and never either
 * person's answers.
 */
export async function loadPair(
  pairId: string,
  fetchImpl?: typeof fetch,
): Promise<PairOutcome> {
  if (pairId === "" || pairId.length > MAX_ID_LENGTH) return { status: "not_found" };

  const result = await weftFetch<unknown>(
    `/api/pair/${encodeURIComponent(pairId)}`,
    { method: "GET" },
    fetchImpl,
  );

  if (!result.ok) {
    if (result.code === "not_found") return { status: "not_found" };
    return { status: "unavailable" };
  }

  if (!isPairResult(result.data)) {
    console.error("weft_core returned an unrenderable pair result");
    return { status: "unavailable" };
  }

  return { status: "ok", result: result.data };
}
