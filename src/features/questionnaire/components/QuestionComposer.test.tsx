import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Question } from "../types/questionnaire.types";
import { QuestionComposer } from "./QuestionComposer";

const options = [
  { id: "one", label: "Founders", value: "founders" },
  { id: "two", label: "Operators", value: "operators" },
  { id: "three", label: "Investors", value: "investors" },
];

function render(question: Question) {
  return renderToStaticMarkup(
    <QuestionComposer
      disabled={false}
      error={null}
      onSubmit={() => {}}
      question={question}
    />,
  );
}

test("question discriminants render only their relevant composer", () => {
  const textHtml = render({
    id: "work",
    type: "text",
    message: "What are you building?",
    required: true,
    multiline: false,
    inputFormat: "text",
    maxLength: 200,
  });
  const singleHtml = render({
    id: "reason",
    type: "single_choice",
    message: "Why are you here?",
    options,
  });
  const multipleHtml = render({
    id: "topics",
    type: "multiple_choice",
    message: "Choose topics",
    options,
    minSelections: 2,
    maxSelections: 3,
  });
  const hybridHtml = render({
    id: "people",
    type: "hybrid",
    message: "Who should you meet?",
    options,
    allowOther: true,
  });

  expect(textHtml).toContain('data-composer="text"');
  expect(textHtml).toContain('type="text"');
  expect(singleHtml).toContain('role="radiogroup"');
  expect(singleHtml).not.toContain('type="text"');
  expect(multipleHtml).toContain('role="group"');
  expect(multipleHtml).not.toContain("Continue");
  expect(hybridHtml).toContain("Other");
});

test("choice controls expose native focus targets and checked state", () => {
  const singleHtml = render({
    id: "reason",
    type: "single_choice",
    message: "Why are you here?",
    options,
  });
  const multipleHtml = render({
    id: "topics",
    type: "multiple_choice",
    message: "Choose topics",
    options,
    minSelections: 1,
  });

  expect(singleHtml).toContain('<button aria-checked="false"');
  expect(singleHtml).toContain('role="radio"');
  expect(multipleHtml).toContain('<button aria-checked="false"');
  expect(multipleHtml).toContain('role="checkbox"');
});
