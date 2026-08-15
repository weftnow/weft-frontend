import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Nav } from "./Nav";

test("navigation exposes the premium shell and accessible mobile disclosure", () => {
  const html = renderToStaticMarkup(<Nav />);

  expect(html).toContain('aria-label="Primary navigation"');
  expect(html).toContain('aria-label="Open navigation"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("nav-premium-shell");
});

test("navigation's call to action sends organizers to sign in", () => {
  const html = renderToStaticMarkup(<Nav />);

  // Only the desktop button is in the initial markup; the mobile disclosure
  // mounts on open. Both read the same `content.nav.cta`, so covering one
  // covers the pair -- what matters here is that neither still says /match.
  expect(html).toContain('href="/organizer/login"');
  expect(html).toContain("Sign in");
  expect(html).not.toContain('href="/match"');
});

test("the mobile disclosure shares the desktop call to action", () => {
  // Guards the seam the static render cannot reach: a future edit that
  // hardcodes one of the two buttons would leave this pair disagreeing.
  const source = readFileSync(new URL("./Nav.tsx", import.meta.url), "utf8");

  expect(source.match(/content\.nav\.cta\.href/g)).toHaveLength(2);
  expect(source).not.toContain('href="/match"');
});

test("navigation uses pill geometry and Zolo's link font treatment", () => {
  const styles = readFileSync(new URL("../../styles/globals.css", import.meta.url), "utf8");

  expect(styles).toMatch(/\.nav-premium-shell\s*\{[^}]*border-radius:\s*999px;/s);
  expect(styles).toMatch(/\.nav-cta\s*\{[^}]*border-radius:\s*999px;/s);
  expect(styles).toMatch(
    /\.nav-link\s*\{[^}]*font-family:\s*var\(--font-mono\);[^}]*font-size:\s*14px;[^}]*font-weight:\s*600;[^}]*letter-spacing:\s*normal;/s,
  );
});
