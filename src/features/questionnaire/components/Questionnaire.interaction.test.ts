import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test(
  "full questionnaire conversation passes in an isolated DOM",
  async () => {
    const projectRoot = fileURLToPath(new URL("../../../..", import.meta.url));
    const mountedSuite = fileURLToPath(
      new URL("./Questionnaire.interaction.mount.tsx", import.meta.url),
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
  30_000,
);

test(
  "composer waits for real typewriter completion",
  async () => {
    const projectRoot = fileURLToPath(new URL("../../../..", import.meta.url));
    const mountedSuite = fileURLToPath(
      new URL("./Questionnaire.motion.mount.tsx", import.meta.url),
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
