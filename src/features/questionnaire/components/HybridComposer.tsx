"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Question } from "../types/questionnaire.types";

type HybridQuestion = Extract<Question, { type: "hybrid" }>;
const OTHER_VALUE = "__weft_other__";

export function HybridComposer({
  question,
  disabled,
  error,
  onSubmit,
}: {
  question: HybridQuestion;
  disabled: boolean;
  error: string | null;
  onSubmit: (value: string) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [otherValue, setOtherValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const otherSelected = selected === OTHER_VALUE;

  useEffect(() => {
    firstOptionRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (otherSelected) {
      window.requestAnimationFrame(() =>
        otherInputRef.current?.focus({ preventScroll: true }),
      );
    }
  }, [otherSelected]);

  const choose = async (value: string) => {
    if (disabled || submitting) return;
    setSelected(value);
    if (value === OTHER_VALUE) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 160));
    try {
      await onSubmit(value);
    } catch {
      setSubmitting(false);
    }
  };

  const submitOther = async (event?: FormEvent) => {
    event?.preventDefault();
    const answer = otherValue.trim();
    if (!answer || disabled || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(answer);
    } catch {
      setSubmitting(false);
      window.requestAnimationFrame(() => otherInputRef.current?.focus());
    }
  };

  const choices = [
    ...question.options,
    { id: "other", label: "Other", value: OTHER_VALUE },
  ];

  return (
    <motion.fieldset
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-[40rem]"
      data-composer="hybrid"
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      <legend className="sr-only">{question.message}</legend>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup">
        {choices.map((option, index) => {
          const checked = selected === option.value;
          return (
            <motion.button
              aria-checked={checked}
              className={`flex min-h-14 items-center justify-between rounded-[1.05rem] border px-4 py-3 text-left text-[0.9rem] leading-5 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal ${
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
      <AnimatePresence initial={false}>
        {otherSelected ? (
          <motion.form
            animate={{ opacity: 1, height: "auto", y: 0 }}
            className="mt-3 flex items-center gap-2 rounded-[1.05rem] border border-ember/35 bg-white/68 p-2 pl-4"
            exit={{ opacity: 0, height: 0, y: -3 }}
            initial={{ opacity: 0, height: 0, y: -3 }}
            onSubmit={submitOther}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          >
            <input
              aria-label="Tell us who you would like to meet"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/38"
              disabled={disabled || submitting}
              onChange={(event) => setOtherValue(event.target.value)}
              placeholder="Tell us who…"
              ref={otherInputRef}
              type="text"
              value={otherValue}
            />
            <button
              aria-label="Send other answer"
              className="grid size-11 place-items-center rounded-full bg-ember text-white disabled:bg-ember/18 disabled:text-ember/45 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal"
              disabled={!otherValue.trim() || disabled || submitting}
              type="submit"
            >
              <span aria-hidden="true">→</span>
            </button>
          </motion.form>
        ) : null}
      </AnimatePresence>
      {error ? <p className="mt-2 px-2 text-sm text-[#a63b18]" role="alert">{error}</p> : null}
    </motion.fieldset>
  );
}
