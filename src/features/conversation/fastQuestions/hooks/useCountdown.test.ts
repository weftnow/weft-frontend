import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { formatCountdown, remainingMilliseconds } from "./useCountdown";

test("derives from an absolute deadline and clamps at zero", () => {
  const deadline = "2026-08-08T20:00:30.000Z";
  expect(remainingMilliseconds(deadline, Date.parse("2026-08-08T20:00:00.000Z")))
    .toBe(30_000);
  expect(remainingMilliseconds(deadline, Date.parse("2026-08-08T20:01:00.000Z")))
    .toBe(0);
});

test("formats ceiling-based MM:SS", () => {
  expect(formatCountdown(90_000)).toBe("01:30");
  expect(formatCountdown(29_001)).toBe("00:30");
  expect(formatCountdown(0)).toBe("00:00");
});

test(
  "useCountdown mounted behavior passes in an isolated DOM",
  async () => {
    const projectRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
    const mountedSuite = fileURLToPath(
      new URL("./useCountdown.mount.tsx", import.meta.url),
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
