import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HowItWorks } from "./HowItWorks";

test("How section keeps its row media until the desktop preview breakpoint", () => {
  const html = renderToStaticMarkup(<HowItWorks />);

  expect(html).toContain("xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]");
  expect(html).toContain("xl:hidden");
  expect(html).toContain("hidden xl:block");
  // First step is an eager-loaded video, which preloads its full source.
  expect(html).toContain('preload="auto"');
});

test("How section renders the weaving loader in place of media for step two", () => {
  const html = renderToStaticMarkup(<HowItWorks />);

  expect(html).toContain("weave-loader-mark--spin");
  expect(html).toContain("Determine your personality…");
});
