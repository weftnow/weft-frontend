import { mintInvite, type MintOutcome } from "@/lib/server/mintInvite";
import { readSessionId } from "@/lib/server/session";

/**
 * Outcome -> HTTP, kept separate from POST so it can be tested without a
 * request context. `cookies()` throws outside one, and `bun test` has none.
 *
 * The bodies are deliberately bare. The client shows its own copy from
 * content.ts; anything the backend said is for the log, not the browser.
 */
export function respondWithMint(outcome: MintOutcome): Response {
  if (outcome.status === "ok") return Response.json({ token: outcome.token });
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
