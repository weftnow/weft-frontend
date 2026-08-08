"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionnaireCompletionError } from "../hooks/useQuestionnaireController";
import type { QuestionnaireMessages } from "../i18n/questionnaire.messages";
import type { QuestionnaireViewResult } from "../model/questionnaire.reducer";
import type {
  AnswerValue,
  ConversationItem,
  ConversationPhase,
  SubmitAnswerInput,
} from "../types/questionnaire.types";
import { Conversation } from "./Conversation";
import { QuestionComposer } from "./QuestionComposer";

export type QuestionnaireTimings = {
  conversationalPauseMs: number;
  transitionDelayMs: number;
};

function deriveAnimatedQueue(conversation: ConversationItem[]): string[] {
  let lastAnswerIndex = -1;
  conversation.forEach((item, index) => {
    if (item.type === "answer") lastAnswerIndex = index;
  });
  return conversation.slice(lastAnswerIndex + 1).map((item) => item.id);
}

export function QuestionnaireFlow({
  result,
  submitAnswer,
  completeQuestionnaire,
  messages,
  timings,
}: {
  result: QuestionnaireViewResult;
  submitAnswer: (input: SubmitAnswerInput) => Promise<QuestionnaireViewResult>;
  completeQuestionnaire: () => Promise<QuestionnaireViewResult>;
  messages: QuestionnaireMessages;
  timings: QuestionnaireTimings;
}) {
  const [phase, setPhase] = useState<ConversationPhase>(() =>
    result.session.completed
      ? "completed"
      : deriveAnimatedQueue(result.session.conversation).length > 0
        ? "weft_typing"
        : "awaiting_answer",
  );
  const [animatedQueue, setAnimatedQueue] = useState(() =>
    deriveAnimatedQueue(result.session.conversation),
  );
  const [enteringItemId, setEnteringItemId] = useState<string | null>(null);
  const [conversationLimit, setConversationLimit] = useState<number | null>(null);
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
    return result.session.conversation.filter((item) => !hiddenQueuedItems.has(item.id));
  }, [animatedQueue, conversationLimit, result.session.conversation]);
  const activeQuestion = result.activeQuestionId
    ? (result.questionnaire.questions.find((q) => q.id === result.activeQuestionId) ?? null)
    : null;

  const handleTypingComplete = useCallback(
    (itemId: string) => {
      if (itemId !== animatedQueue[0]) return;
      if (animatedQueue.length > 1) {
        setPhase("transitioning");
        void delay(timings.conversationalPauseMs).then(() => {
          setAnimatedQueue((queue) => (queue[0] === itemId ? queue.slice(1) : queue));
          setPhase("weft_typing");
        });
        return;
      }

      setAnimatedQueue([]);
      setPhase(result.session.completed ? "completed" : "awaiting_answer");
    },
    [animatedQueue, delay, result.session.completed, timings.conversationalPauseMs],
  );

  const handleCompletionFailure = useCallback(
    (error: unknown, beforeCompletionLength: number) => {
      setConversationLimit(null);
      if (error instanceof QuestionnaireCompletionError) {
        if (error.data.code === "versionConflict") return;

        const appended = error.result.session.conversation.slice(beforeCompletionLength);
        const newQuestionItems = appended.filter((item) => item.type === "question");
        if (newQuestionItems.length > 0) {
          setSubmissionError(messages.validationError);
          setAnimatedQueue(newQuestionItems.map((item) => item.id));
          setPhase("weft_typing");
          return;
        }

        setSubmissionError(
          error.data.code === "idempotencyConflict"
            ? messages.idempotencyConflict
            : messages.submissionFailed,
        );
        setPhase("awaiting_answer");
        return;
      }

      setSubmissionError(messages.submissionFailed);
      setPhase("awaiting_answer");
    },
    [messages],
  );

  const submitCurrentAnswer = useCallback(
    async (value: AnswerValue) => {
      if (!activeQuestion || phase !== "awaiting_answer") return;
      const beforeLength = result.session.conversation.length;
      setSubmissionError(null);
      setConversationLimit(beforeLength);
      setPhase("submitting_answer");

      let updated: QuestionnaireViewResult;
      try {
        updated = await submitAnswer({ questionId: activeQuestion.id, value });
      } catch (error) {
        setConversationLimit(null);
        setSubmissionError(messages.validationError);
        setPhase("awaiting_answer");
        throw error;
      }

      const appended = updated.session.conversation.slice(beforeLength);
      const answerItem = appended.find((item) => item.type === "answer");
      const nextQuestionItems = appended.filter((item) => item.type === "question");
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
        handleCompletionFailure(error, beforeCompletionLength);
      }
    },
    [
      activeQuestion,
      completeQuestionnaire,
      delay,
      handleCompletionFailure,
      messages.validationError,
      phase,
      result.session.conversation.length,
      submitAnswer,
      timings.transitionDelayMs,
    ],
  );

  const retrySubmission = useCallback(async () => {
    if (phase !== "awaiting_answer" || activeQuestion) return;
    setSubmissionError(null);
    const beforeCompletionLength = result.session.conversation.length;
    setConversationLimit(beforeCompletionLength);
    setPhase("submitting_answer");
    try {
      const completed = await completeQuestionnaire();
      const completionItems = completed.session.conversation
        .slice(beforeCompletionLength)
        .filter((item) => item.type === "question");
      setAnimatedQueue(completionItems.map((item) => item.id));
      setConversationLimit(null);
      setPhase("weft_typing");
    } catch (error) {
      handleCompletionFailure(error, beforeCompletionLength);
    }
  }, [activeQuestion, completeQuestionnaire, handleCompletionFailure, phase, result.session.conversation.length]);

  const showRetry =
    phase === "awaiting_answer" &&
    !activeQuestion &&
    !result.session.completed &&
    submissionError !== null;

  const composer =
    phase === "awaiting_answer" && activeQuestion ? (
      <motion.div
        className="w-full"
        exit={reducedMotion ? undefined : { opacity: 0, y: 4 }}
        key={activeQuestion.id}
        transition={{ duration: reducedMotion ? 0 : 0.16 }}
      >
        <QuestionComposer
          disabled={false}
          error={submissionError}
          messages={messages}
          onSubmit={submitCurrentAnswer}
          question={activeQuestion}
        />
      </motion.div>
    ) : showRetry ? (
      <motion.div className="w-full" key="retry">
        <p className="mb-3 px-2 text-center text-sm text-[#a63b18]" role="alert">
          {submissionError}
        </p>
        <button
          className="mx-auto flex min-h-13 items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
          onClick={() => void retrySubmission()}
          type="button"
        >
          {messages.retry}
        </button>
      </motion.div>
    ) : null;

  return (
    <main className="questionnaire-shell">
      <div className="questionnaire-frame" data-questionnaire-phase={phase}>
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
          composerVersion={phase === "awaiting_answer" ? (activeQuestion?.id ?? "retry") : undefined}
          enteringItemId={enteringItemId}
          items={visibleItems}
          onTypingComplete={handleTypingComplete}
        />

        <div className="questionnaire-composer">
          {reducedMotion ? composer : <AnimatePresence mode="wait">{composer}</AnimatePresence>}
        </div>
      </div>
    </main>
  );
}
