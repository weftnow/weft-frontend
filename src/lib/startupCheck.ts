/**
 * The Node-only half of `src/instrumentation.ts`, kept in its own module for
 * one reason: Next compiles the instrumentation hook for the Edge runtime too,
 * and the Edge bundler rejects a module whose source names `process.exit` --
 * regardless of the `NEXT_RUNTIME` guard that stops it ever running there,
 * because that guard is a runtime check and this rejection happens at build.
 *
 * A rejected module is not a warning in dev. Turbopack retries it several
 * times a second, each retry reloading the page, and the app remounts on a
 * loop until the screen is visibly blinking.
 *
 * `instrumentation.ts` reaches this file through `await import()`, which the
 * Edge bundler does not follow, so the Node-only call never enters the Edge
 * graph. Anything else here that needs Node belongs behind that same seam.
 */

import { assertConversationConfigured } from
  "@/features/conversation/fastQuestions/api/server/fastQuestions.source";

export function assertConfiguredOrExit(environment: NodeJS.ProcessEnv = process.env): void {
  try {
    assertConversationConfigured(environment);
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
