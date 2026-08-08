"use client";

import type { QuestionnaireMessages } from "../i18n/questionnaire.messages";
import type {
  AnswerValue,
  Question,
} from "../types/questionnaire.types";
import { HybridComposer } from "./HybridComposer";
import { LongTextComposer } from "./LongTextComposer";
import { MultipleChoiceComposer } from "./MultipleChoiceComposer";
import { SingleChoiceComposer } from "./SingleChoiceComposer";
import { TextComposer } from "./TextComposer";

export type QuestionComposerProps = {
  question: Question;
  disabled: boolean;
  error: string | null;
  messages: QuestionnaireMessages;
  onSubmit: (value: AnswerValue) => Promise<void> | void;
};

export function QuestionComposer({
  question,
  disabled,
  error,
  messages,
  onSubmit,
}: QuestionComposerProps) {
  switch (question.type) {
    case "text":
      return question.multiline ? (
        <LongTextComposer
          disabled={disabled}
          error={error}
          messages={messages}
          onSubmit={onSubmit}
          question={question}
        />
      ) : (
        <TextComposer
          disabled={disabled}
          error={error}
          messages={messages}
          onSubmit={onSubmit}
          question={question}
        />
      );
    case "single_choice":
      return (
        <SingleChoiceComposer
          disabled={disabled}
          error={error}
          onSubmit={onSubmit}
          question={question}
        />
      );
    case "multiple_choice":
      return (
        <MultipleChoiceComposer
          disabled={disabled}
          error={error}
          messages={messages}
          onSubmit={onSubmit}
          question={question}
        />
      );
    case "hybrid":
      return (
        <HybridComposer
          disabled={disabled}
          error={error}
          onSubmit={onSubmit}
          question={question}
        />
      );
  }
}
