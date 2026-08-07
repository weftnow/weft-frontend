import { mintInvite, type MintOutcome } from "@/features/demo-b2c/api/server/mintInvite";
import { readSessionId } from "@/features/demo-b2c/api/server/session";

/**
 * Outcome -> HTTP, kept separate from POST so it can be tested without a
 * request context. `cookies()` throws outside one, and `bun test` has none.
 *
 * The bodies are deliberately bare. The client shows its own copy from
 * content.ts; anything the backend said is for the log, not the browser.
 *
 * A success carries both tokens: the invite to send, and the sender's own way
 * back to whatever that invite produces. Dropping the second would mint a
 * capability nobody ever receives -- and lose that pair the moment the sender's
 * cookie does.
 */
export function respondWithMint(outcome: MintOutcome): Response {
  if (outcome.status === "ok") {
    return Response.json({ token: outcome.token, return_token: outcome.returnToken });
  }
  if (outcome.status === "no_session") {
    return Response.json({ error: "no_session" }, { status: 401 });
  }
  if (outcome.status === "not_found") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json({ error: "unavailable" }, { status: 503 });
}

/**
 * Mint another share link for whoever holds the cookie. The only endpoint in
 * this integration a browser actually calls for data -- everything else is a
 * Server Component reaching weft_core directly.
 */
export async function POST() {
  return respondWithMint(await mintInvite(await readSessionId()));
}
