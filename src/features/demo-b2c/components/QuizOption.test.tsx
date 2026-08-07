import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QuizOptionCard } from "./QuizOption";

const option = { id: "Q1-5", label: "My routines" };

test("option card renders a neutral marker beyond four answers", () => {
  const html = renderToStaticMarkup(
    <QuizOptionCard
      kind="multi"
      onChoose={() => {}}
      option={option}
      optionIndex={5}
      selected={false}
    />,
  );

  expect(html).toContain(">F<");
  expect(html).toContain("My routines");
  expect(html).toContain('role="checkbox"');
  expect(html).toContain('aria-checked="false"');
});

test("selected option exposes its real checked state", () => {
  const html = renderToStaticMarkup(
    <QuizOptionCard
      kind="single"
      onChoose={() => {}}
      option={option}
      optionIndex={0}
      selected
    />,
  );

  expect(html).toContain("ctest-option--on");
  expect(html).toContain('role="radio"');
  expect(html).toContain('aria-checked="true"');
});
