import { weftFetch } from "@/lib/api/weftApi";

/**
 * Minting a second link for a session is supported and cheap: invites are not
 * single-use and there is no cap (`weft/api.py:163-167`).
 */
export type MintOutcome =
  | { status: "ok"; token: string; returnToken: string }
  | { status: "no_session" }
  | { status: "not_found" }
  | { status: "unavailable" };

const MAX_ID_LENGTH = 128;

export async function mintInvite(
  sessionId: string | null,
  fetchImpl?: typeof fetch,
): Promise<MintOutcome> {
  if (!sessionId || sessionId.length > MAX_ID_LENGTH) return { status: "no_session" };

  const result = await weftFetch<unknown>(
    "/api/invite",
    { method: "POST", body: JSON.stringify({ session_id: sessionId }) },
    fetchImpl,
  );

  if (!result.ok) {
    if (result.code === "not_found") return { status: "not_found" };
    return { status: "unavailable" };
  }

  const data = result.data as { token?: unknown; return_token?: unknown } | null;
  const token = data?.token;
  const returnToken = data?.return_token;
  if (typeof token !== "string" || token === "") {
    console.error("weft_core minted an unusable invite token");
    return { status: "unavailable" };
  }
  // Both tokens or neither, the same rule `isAnswersResponse` applies to
  // /api/answers: every invite has a return token, and an invite whose return
  // token never reaches the sender is a pair they can lose for good. Refusing
  // here is loud; a backend that has not shipped `return_token` yet fails the
  // quiz outright anyway, so this cannot be the first thing anyone notices.
  if (typeof returnToken !== "string" || returnToken === "") {
    console.error("weft_core minted an invite with no usable return token");
    return { status: "unavailable" };
  }

  return { status: "ok", token, returnToken };
}
