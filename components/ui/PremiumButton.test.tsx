import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PremiumButton } from "./PremiumButton";

test("premium CTA keeps one accessible label while rendering rolling glyphs", () => {
  const html = renderToStaticMarkup(
    <PremiumButton href="#contact">Try it!</PremiumButton>,
  );

  expect(html).toContain('href="#contact"');
  expect(html).toContain('aria-label="Try it!"');
  expect(html).toContain('class="premium-cta');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("M 14.619 6.75");
  expect(html).toContain("M 14.185 2.395");
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
