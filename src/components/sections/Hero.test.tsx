import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { content } from "@/content";
import { Hero } from "./Hero";

test("hero renders CTA-first markup with separately addressable headline words", () => {
  const html = renderToStaticMarkup(<Hero />);

  expect(html).toContain('class="hero-actions hero-actions--initial"');
  expect(html).toContain('aria-label="Try it!"');
  expect(html).toContain('data-hero-word="Matched"');
  expect(html).toContain('data-hero-word="on"');
  expect(html).toContain('data-hero-word="what"');
  expect(html).toContain('data-hero-word="matters,"');
  expect(html).toContain('data-hero-word="your"');
  expect(html).toContain('data-hero-word="badge."');
  expect(html).toContain('class="hero-title-word hero-title-accent"');
  expect(html).toContain('class="hero-title-character"');
  // The wording itself is pinned in content.test.ts; this test only cares that
  // the sub reaches the markup, so copy edits land in one place.
  expect(html).toContain(content.hero.sub);
  expect(html).not.toContain("hero-secondary-link");
});

test("hero headline uses breakable spaces between animated words", () => {
  const html = renderToStaticMarkup(<Hero />);
  const headlineMarkup = html.slice(html.indexOf("<h1"), html.indexOf("</h1>") + 5);

  expect(headlineMarkup).not.toContain("\u00a0");
  expect(headlineMarkup).toContain(
    '</span> <span aria-hidden="true" class="hero-title-word" data-hero-word="on">',
  );
});
