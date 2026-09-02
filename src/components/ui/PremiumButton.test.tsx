import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PremiumButton } from "./PremiumButton";

test("premium CTA keeps one accessible label while rendering rolling glyphs", () => {
  const html = renderToStaticMarkup(
    <PremiumButton href="#contact">Book a call</PremiumButton>,
  );

  expect(html).toContain('href="#contact"');
  expect(html).toContain('aria-label="Book a call"');
  expect(html).toContain('class="premium-cta');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("M 14.619 6.75");
  expect(html).toContain("M 14.185 2.395");
});

// The roll needs two copies of every glyph. When both were real DOM text,
// anything reading the markup got "BBooookk aa ccaallll".
test("the label is readable exactly once and never doubled letter by letter", () => {
  const html = renderToStaticMarkup(
    <PremiumButton href="/match">Book a call</PremiumButton>,
  );

  const readable = html.replace(/<[^>]*>/g, "");
  expect(readable).toBe("Book a call");

  const labelMatches = html.match(/Book a call/g) ?? [];
  expect(labelMatches).toHaveLength(2); // aria-label plus the readable span
  expect(html).toContain('data-glyph="B"');
  expect(html.includes("BB")).toBe(false);
});

test("premium button reflects a disabled state in markup", () => {
  const html = renderToStaticMarkup(
    <PremiumButton tone="ink" disabled>
      Next
    </PremiumButton>,
  );
  expect(html).toContain("disabled");
  expect(html).toContain("pointer-events-none");
});

test("a disabled button does not carry the hand marker", () => {
  const html = renderToStaticMarkup(
    <PremiumButton disabled onClick={() => {}} tone="ink">Next</PremiumButton>,
  );
  expect(html).not.toContain("premium-cta-hand-track");
  const enabled = renderToStaticMarkup(<PremiumButton onClick={() => {}}>Next</PremiumButton>);
  expect(enabled).toContain("premium-cta-hand-track");
});

test("hand={false} opts an enabled button out of the hand marker", () => {
  const html = renderToStaticMarkup(
    <PremiumButton hand={false} onClick={() => {}} tone="ink">Next</PremiumButton>,
  );
  expect(html).not.toContain("premium-cta-hand-track");
});
