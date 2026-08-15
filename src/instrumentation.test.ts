import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * Next compiles `instrumentation.ts` for every runtime it might register a
 * hook in, Edge included. The `NEXT_RUNTIME` guard inside `register()` is a
 * runtime check, and the Edge bundler never gets that far: it reads the
 * module's source, finds a Node-only API, and fails the module outright
 * ("Ecmascript file had an error"). In dev that failure is retried several
 * times a second, and every retry reloads the page -- the whole app remounts
 * on a loop and the screen visibly blinks.
 *
 * So the constraint is on the source text, not on behaviour: whatever this
 * module needs from Node has to sit behind the dynamic import, which the Edge
 * bundler does not follow.
 */
const source = readFileSync(new URL("./instrumentation.ts", import.meta.url), "utf8");

test("instrumentation names no Node-only API the Edge bundler would choke on", () => {
  expect(source).not.toContain("process.exit");
});

test("instrumentation still reads the runtime env it branches on", () => {
  // The guard itself must survive: reading `process.env` is fine in Edge, and
  // dropping it would run the Node-only check in a runtime that never serves
  // the routes it protects.
  expect(source).toContain("process.env.NEXT_RUNTIME");
  expect(source).toContain("phase-production-build");
});
