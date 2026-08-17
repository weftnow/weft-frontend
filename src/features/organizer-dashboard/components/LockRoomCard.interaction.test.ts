import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

/**
 * Run in a subprocess for the same reason the other interaction suites are:
 * the mounted suite installs a JSDOM window over the global scope, and that is
 * not something to leave behind for whichever test file bun runs next.
 */
test(
  "lock room card passes in an isolated DOM",
  async () => {
    const projectRoot = fileURLToPath(new URL("../../../..", import.meta.url));
    const mountedSuite = fileURLToPath(
      new URL("./LockRoomCard.mount.tsx", import.meta.url),
    );
    const subprocess = Bun.spawn({
      cmd: [process.execPath, "test", mountedSuite],
      cwd: projectRoot,
      stderr: "pipe",
      stdout: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
      subprocess.exited,
    ]);
    expect(exitCode, `${stdout}\n${stderr}`).toBe(0);
  },
  20_000,
);
