import { respondToSubmission } from "@/features/demo-b2c/api/server/answersResponse";
import { setSessionCookie } from "@/features/demo-b2c/api/server/session";
import { submitAnswers } from "@/features/demo-b2c/api/server/submitAnswers";

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
