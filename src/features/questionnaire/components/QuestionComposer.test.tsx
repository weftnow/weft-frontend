import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { questionnaireMessages } from "../i18n/questionnaire.messages";
import type { Question } from "../types/questionnaire.types";
import { QuestionComposer } from "./QuestionComposer";

const messages = questionnaireMessages.en;

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
      messages={messages}
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
  const longTextHtml = render({
    id: "purpose",
    type: "text",
    message: "What do you want to accomplish today?",
    required: true,
    multiline: true,
    inputFormat: "text",
    maxLength: 1000,
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
  expect(longTextHtml).toContain('data-composer="long-text"');
  expect(longTextHtml).toContain("<textarea");
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

test("numeric single choice options render without stringifying their value", () => {
  const html = render({
    id: "s2",
    type: "single_choice",
    message: "How long have you been in this?",
    required: true,
    options: [
      { id: "s2:1", label: "Just starting", value: 1 },
      { id: "s2:2", label: "2-5 years", value: 2 },
    ],
  });
  expect(html).toContain("Just starting");
  expect(html).toContain("2-5 years");
});

test("optional questions render a localized Skip control", () => {
  const html = render({
    id: "email",
    type: "text",
    message: "Email",
    required: false,
    multiline: false,
    inputFormat: "email",
    maxLength: 254,
  });
  expect(html).toContain(messages.skip);
  expect(html).toContain('type="email"');
});

test("required questions never render a Skip control", () => {
  const html = render({
    id: "work",
    type: "text",
    message: "What are you building?",
    required: true,
    multiline: false,
    inputFormat: "text",
    maxLength: 200,
  });
  expect(html).not.toContain(messages.skip);
});
