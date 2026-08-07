import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Faq } from "./Faq";

test("FAQ starts collapsed with accessible disclosure controls", () => {
  const html = renderToStaticMarkup(<Faq />);
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain('aria-expanded="true"');
  expect(html).toContain('aria-controls="faq-answer-0"');
});

test("FAQ uses a restrained centered accordion layout", () => {
  const html = renderToStaticMarkup(<Faq />);
  expect(html).toContain("max-w-3xl");
  expect(html).toContain("z-[3]");
  expect(html).toContain("md:text-5xl");
});
