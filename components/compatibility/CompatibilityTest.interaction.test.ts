import { expect, test } from "bun:test";

test(
  "questionnaire mounted interactions pass in an isolated DOM",
  async () => {
    const subprocess = Bun.spawn({
      cmd: [
        process.execPath,
        "test",
        "./components/compatibility/CompatibilityTest.interaction.mount.tsx",
      ],
      cwd: process.cwd(),
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
