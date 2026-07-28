import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QuizProgress } from "./QuizProgress";

test("progress reports the real current step and served total", () => {
  const html = renderToStaticMarkup(
    <QuizProgress activeIndex={1} total={20} />,
  );

  expect(html).toContain("2 of 20");
  expect(html).toContain('aria-valuenow="2"');
  expect(html).toContain('aria-valuemax="20"');
  expect(html).toContain("width:10%");
});

test("progress stays bounded for an empty bank", () => {
  const html = renderToStaticMarkup(
    <QuizProgress activeIndex={0} total={0} />,
  );

  expect(html).toContain("0 of 0");
  expect(html).toContain("width:0%");
});
