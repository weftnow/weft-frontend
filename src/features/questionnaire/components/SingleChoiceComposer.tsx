"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { AnswerScalar, Question } from "../types/questionnaire.types";

type SingleQuestion = Extract<Question, { type: "single_choice" }>;

export function SingleChoiceComposer({
  question,
  disabled,
  error,
  onSubmit,
}: {
  question: SingleQuestion;
  disabled: boolean;
  error: string | null;
  onSubmit: (value: AnswerScalar) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<AnswerScalar | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    firstOptionRef.current?.focus({ preventScroll: true });
  }, []);

  const choose = async (value: AnswerScalar) => {
    if (disabled || submitting) return;
    setSelected(value);
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 160));
    try {
      await onSubmit(value);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <motion.fieldset
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-[40rem]"
      data-composer="single-choice"
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      <legend className="sr-only">{question.message}</legend>
      <div className="grid gap-2.5" role="radiogroup">
        {question.options.map((option, index) => {
          const checked = selected === option.value;
          return (
            <motion.button
              aria-checked={checked}
              className={`flex min-h-14 items-center justify-between rounded-[1.15rem] border px-4 py-3 text-left text-[0.94rem] leading-6 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                checked
                  ? "border-ember/48 bg-[color-mix(in_srgb,var(--color-ember)_8%,white)] text-[#c84419]"
                  : "border-ink/10 bg-white/48 text-ink hover:border-ink/18"
              }`}
              disabled={disabled || submitting}
              key={option.id}
              onClick={() => void choose(option.value)}
              ref={index === 0 ? firstOptionRef : undefined}
              role="radio"
              type="button"
              whileTap={reducedMotion ? undefined : { scale: 0.99 }}
            >
              <span>{option.label}</span>
              <span
                aria-hidden="true"
                className={`grid size-5 place-items-center rounded-full border ${
                  checked ? "border-ember bg-ember" : "border-ink/18"
                }`}
              >
                {checked ? <span className="size-1.5 rounded-full bg-white" /> : null}
              </span>
            </motion.button>
          );
        })}
      </div>
      {error ? <p className="mt-2 px-2 text-sm text-[#a63b18]" role="alert">{error}</p> : null}
    </motion.fieldset>
  );
}
