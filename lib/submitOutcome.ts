/**
 * The pure decision at the heart of `submit()` in `CompatibilityTest.tsx`:
 * given what `/api/answers` answered, where does the visitor land? Pulled out
 * so it can be tested without a DOM.
 */
export type SubmitDecision =
  | { phase: "share"; token: string; returnToken: string }
  | { phase: "pair"; pairId: string; shareToken: string }
  | { phase: "stranded"; pairId: string; shareToken: string }
  | { phase: "details"; error: string };

/**
 * Never returns `stranded`: that state is not something the response can tell
 * us, only something the browser discovers when it fails to navigate. Saying
 * so in the return type keeps the caller's `else` branch narrowed to `details`
 * instead of forcing a check for a case this function cannot produce.
 * `strandedOutcome` below is its sole producer.
 */
export function decideSubmitOutcome(
  ok: boolean,
  body: { share_token?: string; return_token?: string; pair_id?: string; error?: string } | null,
  fallbackError: string,
): Exclude<SubmitDecision, { phase: "stranded" }> {
  // A pair id means a second person just completed the pair. That result is
  // the destination, and it outranks the share link the same response carries
  // -- the pair page offers the link once they are there.
  if (ok && body?.pair_id) {
    return { phase: "pair", pairId: body.pair_id, shareToken: body.share_token ?? "" };
  }
  if (ok && body?.share_token) {
    // `?? ""` is a type-level default, NOT graceful degradation. A response
    // without `return_token` never reaches this function: `isAnswersResponse`
    // in `lib/server/submitAnswers.ts` rejects it and `/api/answers` answers
    // 503, so an `ok` body always carries one. That makes deploy order
    // mandatory rather than optional -- weft_core must ship `return_token`
    // BEFORE this frontend, or every submission fails and the quiz is offline.
    // The empty string only ever describes a body this branch cannot receive;
    // it exists so the parameter type may keep the field optional.
    return { phase: "share", token: body.share_token, returnToken: body.return_token ?? "" };
  }
  const error = body?.error ? body.error : fallbackError;
  return { phase: "details", error };
}

/**
 * The pair exists upstream but the browser could not get to its page.
 *
 * Deliberately not an error the visitor can retry: the POST succeeded, so a
 * second attempt would create a second session and a second pair for the same
 * person. This is a terminal state that hands over the destination instead.
 */
export function strandedOutcome(
  decision: Extract<SubmitDecision, { phase: "pair" }>,
): Extract<SubmitDecision, { phase: "stranded" }> {
  return { phase: "stranded", pairId: decision.pairId, shareToken: decision.shareToken };
}
