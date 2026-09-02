import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { content } from "@/content";
import { Hero } from "./Hero";

function headlineWords(lines: typeof content.hero.headline) {
  return lines
    .flatMap(({ text, muted }) => [text, muted].filter(Boolean))
    .flatMap((line) => line.split(/\s+/).filter(Boolean));
}

test("hero renders CTA-first markup with separately addressable headline words", () => {
  const html = renderToStaticMarkup(<Hero />);

  expect(html).toContain('class="hero-actions hero-actions--initial"');
  // The wording lives in content.ts and is pinned in content.test.ts. Split it
  // the same way Hero does so a copy edit only has to be made in one place.
  for (const word of headlineWords(content.hero.headline)) {
    expect(html).toContain(`data-hero-word="${word}"`);
  }
  expect(html).toContain('class="hero-title-word hero-title-accent"');
  expect(html).toContain('class="hero-title-character"');
  // The wording itself is pinned in content.test.ts; this test only cares that
  // the sub reaches the markup, so copy edits land in one place. React escapes
  // the apostrophe on the way out.
  expect(html).toContain(content.hero.sub.replace(/'/g, "&#x27;"));
  expect(html).toContain(content.hero.eyebrow);
  expect(html).not.toContain("hero-secondary-link");
});

// Organizers pay for Weft, so their action is the ember button and the
// attendee demo is the quiet one beside it.
test("hero leads with the organizer's booking CTA and keeps the demo second", () => {
  const html = renderToStaticMarkup(<Hero />);

  expect(html).toContain('aria-label="Book a call"');
  expect(html).toContain('aria-label="Try the matching"');
  expect(html.indexOf('aria-label="Book a call"')).toBeLessThan(
    html.indexOf('aria-label="Try the matching"'),
  );
  expect(html).toContain('href="#contact"');
  expect(html).toContain('href="/match"');
  expect(html).toContain("premium-cta--ember");
  expect(html).toContain("premium-cta--quiet");
  expect(html.includes("Try it!")).toBe(false);
});

test("hero headline uses breakable spaces between animated words", () => {
  const html = renderToStaticMarkup(<Hero />);
  const headlineMarkup = html.slice(html.indexOf("<h1"), html.indexOf("</h1>") + 5);

  expect(headlineMarkup).not.toContain("\u00a0");
  expect(headlineMarkup).toContain(
    '</span> <span aria-hidden="true" class="hero-title-word',
  );
});
