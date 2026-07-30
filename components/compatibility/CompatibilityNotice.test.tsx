import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompatibilityNotice } from "./CompatibilityNotice";

test("a notice says what happened and sits in the quiz shell", () => {
  const html = renderToStaticMarkup(
    <CompatibilityNotice
      eyebrow="Link expired"
      headline="This invitation has run out."
      body="Ask for a fresh link."
    />,
  );
  expect(html).toContain("Link expired");
  expect(html).toContain("This invitation has run out.");
  expect(html).toContain("Ask for a fresh link.");
  expect(html).toContain("ctest-shell");
  expect(html).toContain("ctest-home");
});

test("a notice offers a way out only when one is given", () => {
  const without = renderToStaticMarkup(
    <CompatibilityNotice eyebrow="e" headline="h" body="b" />,
  );
  expect(without).not.toContain("/match");

  const withCta = renderToStaticMarkup(
    <CompatibilityNotice
      eyebrow="e"
      headline="h"
      body="b"
      cta={{ href: "/match", label: "Start your own" }}
    />,
  );
  // PremiumButton splits its label into per-glyph spans; aria-label carries it whole.
  expect(withCta).toContain('aria-label="Start your own"');
  expect(withCta).toContain('href="/match"');
});
