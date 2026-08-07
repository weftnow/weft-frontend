import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Testimonials } from "./Testimonials";

test("testimonials renders an arrow-controlled review rail", () => {
  const html = renderToStaticMarkup(<Testimonials />);

  expect(html).toContain("Placeholder portrait for the featured event outcome");
  expect(html).toContain("Placeholder portrait for the second testimonial");
  expect(html).toContain("Placeholder portrait for the third testimonial");
  expect(html).toContain("Turn random networking into real connection");
  expect(html).toContain("Make your event impossible to forget");
  expect(html).toContain("Prove your event created real value");
  expect(html).toContain("font-bold leading-snug text-ink");
  expect(html).toContain("text-lg sm:text-xl md:text-2xl");
  expect(html).toContain("scroll-mt-20");
  expect(html).toContain("bg-[#f4f4f5]");
  expect(html.includes("#d8d3cb")).toBe(false);
  expect(html.includes("The outcome")).toBe(false);
  expect(html.includes("92%")).toBe(false);

  expect(html).toContain("testimonial-rail-viewport");
  expect(html).toContain("testimonial-rail-viewport--faded");
  expect(html).toContain("testimonial-rail-track");
  expect(html).toContain("testimonial-rail-card bg-white");
  expect(html).toContain("testimonial-rail-avatar");
  expect(html).toContain('aria-label="Previous story"');
  expect(html).toContain('aria-label="Next story"');
  expect(html).toContain("Placeholder testimonials");

  expect(html.includes("testimonial-rail-set")).toBe(false);
  expect(html.includes("testimonial-rail-card--wide")).toBe(false);

  const cardMatches = html.match(/data-testimonial-card="true"/g) ?? [];
  expect(cardMatches).toHaveLength(4);
});
