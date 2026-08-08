"use client";

import { motion } from "motion/react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { QuestionnaireMessages } from "../i18n/questionnaire.messages";
import type { AnswerValue, Question } from "../types/questionnaire.types";

type LongTextQuestion = Extract<Question, { type: "text" }>;

export function LongTextComposer({
  question,
  disabled,
  error,
  messages,
  onSubmit,
}: {
  question: LongTextQuestion;
  disabled: boolean;
  error: string | null;
  messages: QuestionnaireMessages;
  onSubmit: (value: AnswerValue) => Promise<void> | void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
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
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const skip = async () => {
    if (disabled || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(null);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-[40rem]"
      data-composer="long-text"
      initial={{ opacity: 0, y: 6 }}
      onSubmit={submit}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      <label className="sr-only" htmlFor={`answer-${question.id}`}>
        {question.message}
      </label>
      <div className="flex items-end gap-2 rounded-[1.35rem] border border-ink/12 bg-white/74 p-2 pl-5 shadow-[0_10px_35px_rgb(18_18_18/4%)] focus-within:border-ember/55">
        <textarea
          aria-describedby={error ? `error-${question.id}` : undefined}
          className="min-h-[4.5rem] w-full flex-1 resize-none bg-transparent py-3 text-base text-ink outline-none placeholder:text-ink/38"
          disabled={disabled || submitting}
          id={`answer-${question.id}`}
          maxLength={question.maxLength}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={question.placeholder ?? "Type your answer…"}
          ref={textareaRef}
          rows={4}
          value={value}
        />
        <button
          aria-label={messages.sendAnswer}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-ember text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-ember/18 disabled:text-ember/45 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal"
          disabled={!value.trim() || disabled || submitting}
          type="submit"
        >
          <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
            <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </button>
      </div>
      {!question.required ? (
        <button
          className="mt-2 px-2 text-sm font-medium text-ink/48 underline-offset-2 hover:text-ink/70 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal"
          disabled={disabled || submitting}
          onClick={() => void skip()}
          type="button"
        >
          {messages.skip}
        </button>
      ) : null}
      {error ? (
        <p className="mt-2 px-2 text-sm text-[#a63b18]" id={`error-${question.id}`} role="alert">
          {error}
        </p>
      ) : null}
    </motion.form>
  );
}
