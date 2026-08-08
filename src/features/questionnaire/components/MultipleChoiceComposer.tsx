"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { QuestionnaireMessages } from "../i18n/questionnaire.messages";
import type { AnswerScalar, Question } from "../types/questionnaire.types";

type MultipleQuestion = Extract<Question, { type: "multiple_choice" }>;

export function MultipleChoiceComposer({
  question,
  disabled,
  error,
  messages,
  onSubmit,
}: {
  question: MultipleQuestion;
  disabled: boolean;
  error: string | null;
  messages: QuestionnaireMessages;
  onSubmit: (value: AnswerScalar[]) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<AnswerScalar[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const minimum = question.minSelections ?? (question.required ? 1 : 0);
  const maximum = question.maxSelections ?? question.options.length;
  const canContinue = selected.length >= minimum;

  useEffect(() => {
    firstOptionRef.current?.focus({ preventScroll: true });
  }, []);

  const toggle = (value: AnswerScalar) => {
    if (disabled || submitting) return;
    setSelected((current) => {
      if (current.includes(value)) {
        return current.filter((selection) => selection !== value);
      }
      if (current.length >= maximum) return current;
      return [...current, value];
    });
  };

  const submit = async () => {
    if (!canContinue || disabled || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(selected);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <motion.fieldset
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-[40rem]"
      data-composer="multiple-choice"
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      <legend className="sr-only">{question.message}</legend>
      <p className="mb-3 px-1 text-sm text-ink/48">
        Choose {minimum === maximum ? minimum : `${minimum}–${maximum}`}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label={question.message}>
        {question.options.map((option, index) => {
          const checked = selected.includes(option.value);
          const atSelectionLimit = selected.length >= maximum && !checked;
          return (
            <motion.button
              aria-checked={checked}
              className={`flex min-h-14 items-center justify-between gap-2 rounded-[1.05rem] border px-3.5 py-3 text-left text-[0.88rem] leading-5 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-45 ${
                checked
                  ? "border-ember/48 bg-[color-mix(in_srgb,var(--color-ember)_8%,white)] text-[#c84419]"
                  : "border-ink/10 bg-white/48 text-ink hover:border-ink/18"
              }`}
              disabled={disabled || submitting || atSelectionLimit}
              key={option.id}
              onClick={() => toggle(option.value)}
              ref={index === 0 ? firstOptionRef : undefined}
              role="checkbox"
              type="button"
              whileTap={reducedMotion ? undefined : { scale: 0.985 }}
            >
              <span>{option.label}</span>
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                  checked ? "border-ember bg-ember text-white" : "border-ink/18"
                }`}
              >
                {checked ? "✓" : null}
              </span>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence initial={false}>
        {canContinue ? (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-[1.05rem] bg-ember px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgb(244_81_30/15%)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal"
            disabled={disabled || submitting}
            exit={{ opacity: 0, y: 4 }}
            initial={{ opacity: 0, y: 4 }}
            onClick={() => void submit()}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            type="button"
          >
            {messages.continue}
            <svg aria-hidden="true" fill="none" height="17" viewBox="0 0 24 24" width="17">
              <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </motion.button>
        ) : null}
      </AnimatePresence>
      {error ? <p className="mt-2 px-2 text-sm text-[#a63b18]" role="alert">{error}</p> : null}
    </motion.fieldset>
  );
}
