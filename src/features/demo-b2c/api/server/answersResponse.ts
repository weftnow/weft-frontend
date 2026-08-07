import type { SubmitOutcome } from "@/features/demo-b2c/api/server/submitAnswers";

/**
 * The wiring `POST` in `app/api/answers/route.ts` needs, pulled out because
 * `cookies()` requires a request context that a Route Handler test can't
 * provide. Everything that *can* be tested without one lives here.
 */
export async function respondToSubmission(
  outcome: SubmitOutcome,
  setCookie: (sessionId: string) => Promise<void>,
): Promise<Response> {
  if (!outcome.ok) {
    return Response.json(outcome.body, { status: outcome.status });
  }

  await setCookie(outcome.sessionId);
  return Response.json(outcome.body);
}
