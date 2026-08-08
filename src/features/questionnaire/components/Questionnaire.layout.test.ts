import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const styles = await readFile(
  new URL("../../../styles/globals.css", import.meta.url),
  "utf8",
);

test("keeps the desktop questionnaire in a centered mobile-derived frame", () => {
  expect(styles).toMatch(
    /\.questionnaire-shell\s*\{[^}]*justify-content:\s*center;/s,
  );
  expect(styles).toMatch(
    /\.questionnaire-frame\s*\{[^}]*flex:\s*0 1 46rem;[^}]*width:\s*100%;/s,
  );
});
