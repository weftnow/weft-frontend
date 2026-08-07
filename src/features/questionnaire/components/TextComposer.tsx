"use client";

import { motion } from "motion/react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Question } from "../types/questionnaire.types";

type TextQuestion = Extract<Question, { type: "text" }>;

export function TextComposer({
  question,
  disabled,
  error,
  onSubmit,
}: {
  question: TextQuestion;
  disabled: boolean;
  error: string | null;
  onSubmit: (value: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const answer = value.trim();
    if (!answer || disabled || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(answer);
    } catch {
      setSubmitting(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <motion.form
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-[40rem]"
      data-composer="text"
      initial={{ opacity: 0, y: 6 }}
      onSubmit={submit}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      <label className="sr-only" htmlFor={`answer-${question.id}`}>
        {question.message}
      </label>
      <div className="flex min-h-16 items-center gap-2 rounded-[1.35rem] border border-ink/12 bg-white/74 p-2 pl-5 shadow-[0_10px_35px_rgb(18_18_18/4%)] focus-within:border-ember/55">
        <input
          aria-describedby={error ? `error-${question.id}` : undefined}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink/38"
          disabled={disabled || submitting}
          id={`answer-${question.id}`}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={question.placeholder ?? "Type your answer…"}
          ref={inputRef}
          type="text"
          value={value}
        />
        <button
          aria-label="Send answer"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-ember text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-ember/18 disabled:text-ember/45 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal"
          disabled={!value.trim() || disabled || submitting}
          type="submit"
        >
          <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
            <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </button>
      </div>
      {error ? (
        <p className="mt-2 px-2 text-sm text-[#a63b18]" id={`error-${question.id}`} role="alert">
          {error}
        </p>
      ) : null}
    </motion.form>
  );
}
