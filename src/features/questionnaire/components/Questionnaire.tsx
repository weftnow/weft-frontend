"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  questionnaireApi,
  type QuestionnaireApi,
} from "../api/questionnaire.api";
import { questionnaireMessages } from "../i18n/questionnaire.messages";
import { useQuestionnaire } from "../hooks/useQuestionnaire";
import type {
  AnswerValue,
  ConversationPhase,
  QuestionnaireResult,
} from "../types/questionnaire.types";
import { Conversation } from "./Conversation";
import { QuestionComposer } from "./QuestionComposer";

export type QuestionnaireTimings = {
  conversationalPauseMs: number;
  transitionDelayMs: number;
};

type QuestionnaireProps = {
  api?: QuestionnaireApi;
  timings?: Partial<QuestionnaireTimings>;
};

const DEFAULT_TIMINGS: QuestionnaireTimings = {
  conversationalPauseMs: 240,
  transitionDelayMs: 220,
};

export function Questionnaire({
  api = questionnaireApi,
  timings,
}: QuestionnaireProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 5 * 60 * 1_000 },
          mutations: { retry: false },
        },
      }),
  );
  const resolvedTimings = { ...DEFAULT_TIMINGS, ...timings };

  return (
    <QueryClientProvider client={queryClient}>
      <QuestionnaireController api={api} timings={resolvedTimings} />
    </QueryClientProvider>
  );
}

function QuestionnaireController({
  api,
  timings,
}: {
  api: QuestionnaireApi;
  timings: QuestionnaireTimings;
}) {
  const controller = useQuestionnaire(api);

  if (controller.isLoading) {
    return (
      <main className="questionnaire-shell questionnaire-state">
        <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/52">
          Getting the conversation ready…
        </p>
      </main>
    );
  }

  if (!controller.result) {
    return (
      <main className="questionnaire-shell questionnaire-state">
        <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
        <h1 className="text-center text-2xl font-medium tracking-[-0.04em]">
          We couldn’t open the questionnaire.
        </h1>
        <button
          className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
          onClick={() => void controller.retry()}
          type="button"
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <QuestionnaireFlow
      completeQuestionnaire={controller.completeQuestionnaire}
      initialResult={controller.result}
      isSubmitting={controller.isSubmitting}
      result={controller.result}
      submitAnswer={controller.submitAnswer}
      timings={timings}
    />
  );
}

function QuestionnaireFlow({
  initialResult,
  result,
  isSubmitting,
  submitAnswer,
  completeQuestionnaire,
  timings,
}: {
  initialResult: QuestionnaireResult;
  result: QuestionnaireResult;
  isSubmitting: boolean;
  submitAnswer: (input: {
    questionId: string;
    value: AnswerValue;
  }) => Promise<QuestionnaireResult>;
  completeQuestionnaire: () => Promise<QuestionnaireResult>;
  timings: QuestionnaireTimings;
}) {
  const initialQueue = initialResult.isNewSession
    ? initialResult.session.conversation
        .filter((item) => item.type === "question")
        .map((item) => item.id)
    : [];
  const [phase, setPhase] = useState<ConversationPhase>(() =>
    initialResult.session.completed
      ? "completed"
      : initialQueue.length > 0
        ? "weft_typing"
        : "awaiting_answer",
  );
  const [animatedQueue, setAnimatedQueue] = useState(initialQueue);
  const [enteringItemId, setEnteringItemId] = useState<string | null>(null);
  const [conversationLimit, setConversationLimit] = useState<number | null>(
    null,
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(
    () => () => {
      for (const timer of timersRef.current) clearTimeout(timer);
      timersRef.current.clear();
    },
    [],
  );

  const delay = useCallback((milliseconds: number) => {
    if (milliseconds <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        resolve();
      }, milliseconds);
      timersRef.current.add(timer);
    });
  }, []);

  const animatedItemId = animatedQueue[0] ?? null;
  const visibleItems = useMemo(() => {
    if (conversationLimit !== null) {
      return result.session.conversation.slice(0, conversationLimit);
    }
    const hiddenQueuedItems = new Set(animatedQueue.slice(1));
    return result.session.conversation.filter(
      (item) => !hiddenQueuedItems.has(item.id),
    );
  }, [animatedQueue, conversationLimit, result.session.conversation]);
  const activeQuestion =
    result.questionnaire.questions[result.session.currentQuestionIndex] ?? null;

  const handleTypingComplete = useCallback(
    (itemId: string) => {
      if (itemId !== animatedQueue[0]) return;
      if (animatedQueue.length > 1) {
        setPhase("transitioning");
        void delay(timings.conversationalPauseMs).then(() => {
          setAnimatedQueue((queue) =>
            queue[0] === itemId ? queue.slice(1) : queue,
          );
          setPhase("weft_typing");
        });
        return;
      }

      setAnimatedQueue([]);
      setPhase(result.session.completed ? "completed" : "awaiting_answer");
    },
    [animatedQueue, delay, result.session.completed, timings.conversationalPauseMs],
  );

  const submitCurrentAnswer = useCallback(
    async (value: AnswerValue) => {
      if (!activeQuestion || phase !== "awaiting_answer" || isSubmitting) return;
      const beforeLength = result.session.conversation.length;
      setSubmissionError(null);
      setConversationLimit(beforeLength);
      setPhase("submitting_answer");

      let updated: QuestionnaireResult;
      try {
        updated = await submitAnswer({ questionId: activeQuestion.id, value });
      } catch (error) {
        setConversationLimit(null);
        setSubmissionError("Couldn’t save that answer. Please try again.");
        setPhase("awaiting_answer");
        throw error;
      }

      const appended = updated.session.conversation.slice(beforeLength);
      const answerItem = appended.find((item) => item.type === "answer");
      const nextQuestionItems = appended.filter(
        (item) => item.type === "question",
      );
      setEnteringItemId(answerItem?.id ?? null);
      setConversationLimit(beforeLength + (answerItem ? 1 : 0));
      setPhase("transitioning");
      await delay(timings.transitionDelayMs);
      setEnteringItemId(null);

      if (nextQuestionItems.length > 0) {
        setAnimatedQueue(nextQuestionItems.map((item) => item.id));
        setConversationLimit(null);
        setPhase("weft_typing");
        return;
      }

      const beforeCompletionLength = updated.session.conversation.length;
      setConversationLimit(beforeCompletionLength);
      try {
        const completed = await completeQuestionnaire();
        const completionItems = completed.session.conversation
          .slice(beforeCompletionLength)
          .filter((item) => item.type === "question");
        setAnimatedQueue(completionItems.map((item) => item.id));
        setConversationLimit(null);
        setPhase("weft_typing");
      } catch (error) {
        setConversationLimit(null);
        setSubmissionError("We saved your answers but couldn’t finish. Please try again.");
        setPhase("transitioning");
        throw error;
      }
    },
    [
      activeQuestion,
      completeQuestionnaire,
      delay,
      isSubmitting,
      phase,
      result.session.conversation.length,
      submitAnswer,
      timings.transitionDelayMs,
    ],
  );

  const composer =
    phase === "awaiting_answer" && activeQuestion ? (
      <motion.div
        className="w-full"
        exit={reducedMotion ? undefined : { opacity: 0, y: 4 }}
        key={activeQuestion.id}
        transition={{ duration: reducedMotion ? 0 : 0.16 }}
      >
        <QuestionComposer
          disabled={isSubmitting}
          error={submissionError}
          messages={questionnaireMessages.en}
          onSubmit={submitCurrentAnswer}
          question={activeQuestion}
        />
      </motion.div>
    ) : null;

  return (
    <main className="questionnaire-shell">
      <div
        className="questionnaire-frame"
        data-questionnaire-phase={phase}
      >
        <header className="questionnaire-header">
          <Image alt="" aria-hidden height={39} src="/icon.svg" width={39} />
          <p className="rounded-full bg-ink/[0.045] px-3.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ink/52">
            <span aria-hidden className="mr-2 text-ember">●</span>
            {result.questionnaire.intro.eyebrow}
          </p>
          <h1 className="text-balance text-center text-[clamp(1.75rem,7vw,2.45rem)] font-medium leading-[1.12] tracking-[-0.055em] text-ink">
            {result.questionnaire.intro.title}{" "}
            <span aria-hidden className="text-ember">♡</span>
          </h1>
          <p className="max-w-[31rem] text-balance text-center text-[0.92rem] leading-6 text-ink/48 sm:text-base">
            {result.questionnaire.intro.subtitle}
          </p>
        </header>

        <Conversation
          animatedItemId={animatedItemId}
          composerVersion={phase === "awaiting_answer" ? activeQuestion?.id : undefined}
          enteringItemId={enteringItemId}
          items={visibleItems}
          onTypingComplete={handleTypingComplete}
        />

        <div className="questionnaire-composer">
          {reducedMotion ? composer : (
            <AnimatePresence mode="wait">{composer}</AnimatePresence>
          )}
        </div>
      </div>
    </main>
  );
}
