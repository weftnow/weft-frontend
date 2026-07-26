import { respondToSubmission } from "@/lib/server/answersResponse";
import { setSessionCookie } from "@/lib/server/session";
import { submitAnswers } from "@/lib/server/submitAnswers";

/**
 * The one write in the whole flow: it creates a session upstream (and, with an
 * invite token, a pair). The returned session id is put straight into the
 * httpOnly cookie and never sent to the browser -- the client only ever needs
 * the share token.
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const outcome = await submitAnswers(raw);
  return respondToSubmission(outcome, setSessionCookie);
}
