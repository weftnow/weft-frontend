import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { CircularTimer } from "./CircularTimer";

const styles = await readFile(
  new URL("./CircularTimer.module.css", import.meta.url),
  "utf8",
);

test("renders accessible non-live proportional progress", () => {
  const html = renderToStaticMarkup(
    <CircularTimer durationSeconds={60} remainingMilliseconds={30_000} running />,
  );
  expect(html).toContain("00:30");
  expect(html).toContain("time left");
  expect(html).toContain('role="timer"');
  expect(html).not.toContain("aria-live");
  expect(html).toContain('data-progress="0.5"');
});

test("renders an ember marker at the countdown arc endpoint", () => {
  const html = renderToStaticMarkup(
    <CircularTimer durationSeconds={60} remainingMilliseconds={30_000} running />,
  );

  expect(html).toContain('data-progress-marker="true"');
  expect(styles).toMatch(/\.endpoint\s*\{[\s\S]*?fill:\s*var\(--color-ember\)/);
});

test("fills its responsive parent as the countdown surface", () => {
  expect(styles).toMatch(
    /\.circularTimer\s*\{(?=[^}]*display:\s*grid;)(?=[^}]*width:\s*100%;)(?=[^}]*height:\s*100%;)[^}]*\}/s,
  );
});
