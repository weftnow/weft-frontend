import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("all application source lives under src", () => {
  expect(existsSync(resolve(projectRoot, "src/app/page.tsx"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/components/ui"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/lib"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "app"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "components"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "lib"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "content.ts"))).toBe(false);
});
