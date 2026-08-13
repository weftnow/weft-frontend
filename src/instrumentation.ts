/**
 * Runs once when the server starts, before it serves anything.
 *
 * Conversation and feedback both resolve their data source per request, which
 * meant a missing `WEFT_CONVERSATION_SOURCE` in production stayed invisible
 * until a real guest opened the last screen of the night and met a retry button
 * that could never succeed. Checking here turns that into a deploy that refuses
 * to come up — loud, immediate, and nobody's evening.
 */
export async function register() {
  // Only the Node runtime serves these routes; the Edge copy of this hook would
  // check the same variables against an environment that never uses them.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // `next build` also runs this hook. A build machine legitimately has no
  // runtime configuration, so failing there would block deploys for a reason
  // that says nothing about the deployed environment.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertConversationConfigured } = await import(
    "@/features/conversation/fastQuestions/api/server/fastQuestions.source"
  );

  try {
    assertConversationConfigured(process.env);
  } catch (error) {
    console.error(
      "startup configuration check failed:",
      error instanceof Error ? error.message : "unknown",
    );
    // Exiting rather than rethrowing, which was measured: Next catches the
    // throw, stops serving, and leaves the process alive. A container that is
    // up but answers nothing reads as healthy to whatever is watching it, and
    // silently black-holes traffic. A dead process is the honest signal, and
    // the one a supervisor knows how to act on.
    process.exit(1);
  }
}
