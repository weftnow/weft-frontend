/**
 * The pure decision at the heart of `submit()` in `CompatibilityTest.tsx`:
 * given what `/api/answers` answered, where does the visitor land? Pulled out
 * so it can be tested without a DOM.
 */
export type SubmitDecision =
  | { phase: "share"; token: string }
  | { phase: "pair"; pairId: string; shareToken: string }
  | { phase: "details"; error: string };

export function decideSubmitOutcome(
  ok: boolean,
  body: { share_token?: string; pair_id?: string; error?: string } | null,
  fallbackError: string,
): SubmitDecision {
  // A pair id means a second person just completed the pair. That result is
  // the destination, and it outranks the share link the same response carries
  // -- the pair page offers the link once they are there.
  if (ok && body?.pair_id) {
    return { phase: "pair", pairId: body.pair_id, shareToken: body.share_token ?? "" };
  }
  if (ok && body?.share_token) {
    return { phase: "share", token: body.share_token };
  }
  const error = body?.error ? body.error : fallbackError;
  return { phase: "details", error };
}
