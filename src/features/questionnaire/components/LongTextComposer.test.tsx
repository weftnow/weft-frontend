import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { questionnaireMessages } from "../i18n/questionnaire.messages";
import type { Question } from "../types/questionnaire.types";
import { LongTextComposer } from "./LongTextComposer";

const messages = questionnaireMessages.en;

type LongTextQuestion = Extract<Question, { type: "text" }>;

const question: LongTextQuestion = {
  id: "t1",
  type: "text",
  message: "What do you want to accomplish today? Be specific.",
  required: true,
  multiline: true,
  inputFormat: "text",
  maxLength: 1_000,
};

test("renders a bounded textarea and no Skip control when required", () => {
  const html = renderToStaticMarkup(
    <LongTextComposer
      disabled={false}
      error={null}
      messages={messages}
      onSubmit={() => {}}
      question={question}
    />,
  );
  expect(html).toContain('data-composer="long-text"');
  expect(html).toContain('maxLength="1000"');
  expect(html).toContain("<textarea");
  expect(html).not.toContain(messages.skip);
});

test("renders a Skip control when the question is optional", () => {
  const html = renderToStaticMarkup(
    <LongTextComposer
      disabled={false}
      error={null}
      messages={messages}
      onSubmit={() => {}}
      question={{ ...question, required: false }}
    />,
  );
  expect(html).toContain(messages.skip);
});

test("shows a validation error message when provided", () => {
  const html = renderToStaticMarkup(
    <LongTextComposer
      disabled={false}
      error="That answer needs another look. Please update it and try again."
      messages={messages}
      onSubmit={() => {}}
      question={question}
    />,
  );
  expect(html).toContain("That answer needs another look");
  expect(html).toContain('role="alert"');
});
