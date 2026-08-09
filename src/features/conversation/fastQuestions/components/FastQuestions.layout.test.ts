import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const styles = await readFile(
  new URL("./FastQuestions.module.css", import.meta.url),
  "utf8",
);

test("uses safe-area mobile framing and constrained-height reductions", () => {
  expect(styles).toMatch(/min-height:\s*100svh/);
  expect(styles).toMatch(/env\(safe-area-inset-top\)/);
  expect(styles).toMatch(/env\(safe-area-inset-bottom\)/);
  expect(styles).toMatch(/@media\s*\(max-height:\s*740px\)/);
});

test("supports reduced motion and six participants without scrolling", () => {
  expect(styles).toMatch(/prefers-reduced-motion:\s*reduce/);
  expect(styles).toMatch(/\[data-count="6"\]/);
  expect(styles).not.toMatch(/overflow-x:\s*scroll/);
});

test("adds a tighter compact-height contract for 320px mobile viewports", () => {
  const compactRule = styles.match(
    /@media\s*\(max-height:\s*600px\)[\s\S]*?(?=\n@media|$)/,
  )?.[0];

  expect(compactRule).toBeDefined();
  expect(compactRule).toMatch(/\.frame\s*\{[\s\S]*?gap:\s*0\.3rem/);
  expect(compactRule).toMatch(/\.avatarFrame\s*\{[\s\S]*?width:\s*2\.5rem/);
  expect(compactRule).toMatch(/\.timer\s*\{[\s\S]*?width:\s*clamp\(8\.5rem/);
});
