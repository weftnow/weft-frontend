"use client";

import type {
  AnswerValue,
  Question,
} from "../types/questionnaire.types";
import { HybridComposer } from "./HybridComposer";
import { MultipleChoiceComposer } from "./MultipleChoiceComposer";
import { SingleChoiceComposer } from "./SingleChoiceComposer";
import { TextComposer } from "./TextComposer";

export type QuestionComposerProps = {
  question: Question;
  disabled: boolean;
  error: string | null;
  onSubmit: (value: AnswerValue) => Promise<void> | void;
};

export function QuestionComposer({
  question,
  disabled,
  error,
  onSubmit,
}: QuestionComposerProps) {
  switch (question.type) {
    case "text":
      return (
        <TextComposer
          disabled={disabled}
          error={error}
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
