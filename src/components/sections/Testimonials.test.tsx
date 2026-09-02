import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Testimonials } from "./Testimonials";

test("testimonials renders an arrow-controlled review rail", () => {
  const html = renderToStaticMarkup(<Testimonials />);

  expect(html).toContain("Attendees sitting together around a cafe table at an event");
  expect(html).toContain("Portrait of Typhaine Morvan, CEO of Bali Exception Sales");
  expect(html).toContain("Portrait of Ayu Sudana, founder of Uttama Hospitality");
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

  expect(html.toLowerCase().includes("placeholder portrait")).toBe(false);
  expect(html.includes("testimonial-rail-set")).toBe(false);
  expect(html.includes("testimonial-rail-card--wide")).toBe(false);

  const cardMatches = html.match(/data-testimonial-card="true"/g) ?? [];
  expect(cardMatches).toHaveLength(4);
});

// Nate has a real quote and no photo of him, so his card shows initials rather
// than a stock face borrowed from a photo library.
test("a story without a photo of its author falls back to initials", () => {
  const html = renderToStaticMarkup(<Testimonials />);

  expect(html).toContain("testimonial-rail-initials");
  expect(html).toContain(">NN<");
  expect(html).toContain("Nate Nwajei");
});
