import { FALLBACK_BANK, isBankResponse } from "@/lib/compatibilityQuestions";
import { weftFetch } from "@/lib/server/weftApi";
import type { BankResponse } from "@/lib/weftTypes";

export type BankSource = "live" | "fallback";
export type LoadedBank = { bank: BankResponse; source: BankSource };

/** The bank changes when someone edits weft_core, which is not often. */
const TTL_MS = 60 * 60 * 1000;

let memo: { at: number; bank: BankResponse } | null = null;

/**
 * The in-flight upstream call, shared so a burst of requests arriving while
 * the memo is cold or expired triggers exactly one fetch instead of one per
 * request.
 */
let inFlight: Promise<LoadedBank> | null = null;

/** Test seam: module state would otherwise leak between test cases. */
export function resetBankCache(): void {
  memo = null;
  inFlight = null;
}

/**
 * The questions, from the backend when it is reachable and from the bundled
 * snapshot when it is not. Answering still needs the backend -- this only
 * guarantees nobody ever meets an empty quiz.
 *
 * Memoised here rather than through `next: { revalidate }` because weftFetch
 * attaches an abort signal, and a signal opts a fetch out of Next's Data Cache.
 */
export async function loadBank(deps?: {
  fetchImpl?: typeof fetch;
  now?: () => number;
}): Promise<LoadedBank> {
  const now = deps?.now ?? Date.now;
  const at = now();
  if (memo && at - memo.at < TTL_MS) return { bank: memo.bank, source: "live" };

  if (!inFlight) {
    inFlight = fetchBank(at, deps?.fetchImpl).finally(() => {
      // Clear on both success and failure -- a failed fetch must not leave a
      // poisoned promise cached for the next caller.
      inFlight = null;
    });
  }
  return inFlight;
}

async function fetchBank(at: number, fetchImpl?: typeof fetch): Promise<LoadedBank> {
  const result = await weftFetch<unknown>("/api/bank", { method: "GET" }, fetchImpl);

  if (!result.ok || !isBankResponse(result.data)) {
    if (result.ok) console.error("weft_core returned an unrenderable bank");
    // Deliberately not memoised: an outage must not be cached for an hour.
    return { bank: FALLBACK_BANK, source: "fallback" };
  }

  memo = { at, bank: result.data };
  return { bank: result.data, source: "live" };
}
