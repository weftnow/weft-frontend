import { isBankQuestion } from "@/features/demo-b2c/schemas/compatibilityQuestions";
import { weftFetch } from "@/lib/server/weftApi";
import type { InviteResponse } from "@/features/demo-b2c/types/contracts";

/**
 * What the friend landing page can be. `expired` is deliberately not folded
 * into `not_found`: "your link ran out" and "we have never seen that link"
 * are different facts, and the person holding the link can act on the first.
 */
export type InviteOutcome =
  | { status: "ok"; invite: InviteResponse }
  | { status: "expired" }
  | { status: "not_found" }
  | { status: "unavailable" };

/** token_urlsafe(16) is 22 characters. Nothing near this cap is a real token. */
const MAX_TOKEN_LENGTH = 128;

export function isInviteResponse(value: unknown): value is InviteResponse {
  if (typeof value !== "object" || value === null) return false;
  const { from_name: from, question_set: set, questions } =
    value as Partial<InviteResponse>;
  if (typeof from !== "string") return false;
  if (!Array.isArray(set) || set.length === 0) return false;
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.every(isBankQuestion);
}

/**
 * The sender's name and the sender's exact questions. Answering the sender's
 * own set -- rather than a freshly loaded bank -- is what stops a later bank
 * edit leaving the two people answering different things.
 */
export async function loadInvite(
  token: string,
  fetchImpl?: typeof fetch,
): Promise<InviteOutcome> {
  // A junk path segment is not worth an upstream round trip.
  if (token === "" || token.length > MAX_TOKEN_LENGTH) return { status: "not_found" };

  const result = await weftFetch<unknown>(
    `/api/invite/${encodeURIComponent(token)}`,
    { method: "GET" },
    fetchImpl,
  );

  if (!result.ok) {
    if (result.code === "expired") return { status: "expired" };
    if (result.code === "not_found") return { status: "not_found" };
    // Including `unauthorized`: a rejected proxy key is our misconfiguration,
    // and the visitor can do nothing with that information.
    return { status: "unavailable" };
  }

  if (!isInviteResponse(result.data)) {
    console.error("weft_core returned an unrenderable invite");
    return { status: "unavailable" };
  }

  return { status: "ok", invite: result.data };
}
