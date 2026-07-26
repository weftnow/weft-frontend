/**
 * The pure decision at the heart of `submit()` in `CompatibilityTest.tsx`:
 * given what `/api/answers` answered, where does the visitor land? Pulled out
 * so it can be tested without a DOM.
 */
export type SubmitOutcome =
  | { phase: "share"; token: string }
  | { phase: "details"; error: string };

export function decideSubmitOutcome(
  ok: boolean,
  body: { share_token?: string; error?: string } | null,
  fallbackError: string,
): SubmitOutcome {
  if (ok && body?.share_token) {
    return { phase: "share", token: body.share_token };
  }
  const error = body?.error ? body.error : fallbackError;
  return { phase: "details", error };
}
