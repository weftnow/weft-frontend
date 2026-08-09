import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { resolveViewState } from "./useFastQuestions";

const base = createMockFastQuestionsSession("6071af2e-7936-4b15-bb44-e4d917337543");

test("maps canonical identity changes to explicit visual states", () => {
  expect(resolveViewState(null, { ...base, status: "active" })).toBe("round_intro");
  expect(resolveViewState(
    { ...base, status: "active", participantIndex: 0 },
    { ...base, status: "active", participantIndex: 1 },
  )).toBe("participant_transition");
  expect(resolveViewState(
    { ...base, status: "active", roundIndex: 0 },
    { ...base, status: "active", roundIndex: 1 },
  )).toBe("round_transition");
  expect(resolveViewState(base, { ...base, status: "phase_complete" }))
    .toBe("phase_complete");
});

test(
  "useFastQuestions mounted behavior passes in an isolated DOM",
  async () => {
    const projectRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
    const mountedSuite = fileURLToPath(
      new URL("./useFastQuestions.mount.tsx", import.meta.url),
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
