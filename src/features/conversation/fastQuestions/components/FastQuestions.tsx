"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { fastQuestionsQueryKey, useFastQuestions } from "../hooks/useFastQuestions";
import { useCountdown } from "../hooks/useCountdown";
import type { FastQuestionsApi } from "../types/fastQuestions.types";
import { CircularTimer, RING_SWEEP_MS } from "./CircularTimer";
import { FastQuestionsCompletion } from "./FastQuestionsCompletion";
import { FastQuestionsNotice } from "./FastQuestionsNotice";
import { FastQuestionsProvider } from "./FastQuestionsProvider";
import { ParticipantList } from "./ParticipantList";
import { QuestionDisplay } from "./QuestionDisplay";
import { RoundProgress } from "./RoundProgress";
import styles from "./FastQuestions.module.css";

export type FastQuestionsProps = {
  eventId: string;
};

type FastQuestionsExperienceProps = FastQuestionsProps & {
  api?: FastQuestionsApi;
  transitionSettleMs?: number;
};

const visuallyHidden = {
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: "1px",
  overflow: "hidden",
  position: "absolute" as const,
  whiteSpace: "nowrap" as const,
  width: "1px",
};

function turnLabel(firstName: string, isCurrentUser: boolean) {
  return isCurrentUser ? "Your turn" : `${firstName}’s turn`;
}

export function FastQuestions({ eventId }: FastQuestionsProps) {
  return (
    <FastQuestionsProvider>
      <FastQuestionsExperience eventId={eventId} />
    </FastQuestionsProvider>
  );
}

/** The provider-free shell keeps the real query integration testable in an isolated DOM. */
export function FastQuestionsExperience({
  api,
  eventId,
  transitionSettleMs,
}: FastQuestionsExperienceProps) {
  const queryClient = useQueryClient();
  const { error, isLoading, retry, session, viewState } = useFastQuestions(eventId, {
    api,
    transitionSettleMs,
  });
  const timerEndsAt = session?.status === "active" ? session.timerEndsAt : null;
  const timerStartedAt = session?.status === "active" ? session.timerStartedAt : null;
  const remainingMilliseconds = useCountdown(timerEndsAt);
  // The reading gap: the question is up but this participant's clock has not
  // started yet. Reusing useCountdown against timerStartedAt keeps this on
  // the same ticking clock as the ring itself (a raw `Date.now()` comparison
  // here would run during render, which React's purity rule disallows) — a
  // positive value means we're still inside the gap, so the ring should hold
  // full and still rather than sweep.
  const readingGapOpen = useCountdown(timerStartedAt) > 0;
  const expiredDeadlineRef = useRef<string | null>(null);
  const expirySettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = Boolean(useReducedMotion());

  // On expiry, wait for the ring's closing sweep (RING_SWEEP_MS) to finish
  // before advancing the session — otherwise the view swaps to the next
  // participant while the endpoint marker is still mid-flight to the top.
  useEffect(() => {
    if (
      !timerEndsAt ||
      remainingMilliseconds > 0 ||
      expiredDeadlineRef.current === timerEndsAt
    ) return;
    expiredDeadlineRef.current = timerEndsAt;
    expirySettleTimeoutRef.current = setTimeout(() => {
      expirySettleTimeoutRef.current = null;
      void queryClient.invalidateQueries({ queryKey: fastQuestionsQueryKey(eventId) });
    }, reducedMotion ? 0 : RING_SWEEP_MS);
  }, [eventId, queryClient, remainingMilliseconds, timerEndsAt, reducedMotion]);

  useEffect(
    () => () => {
      if (expirySettleTimeoutRef.current !== null) clearTimeout(expirySettleTimeoutRef.current);
    },
    [],
  );

  if (error) return <FastQuestionsNotice onRetry={retry} status="error" />;
  if (!session || isLoading) return <FastQuestionsNotice status="loading" />;
  if (session.status === "phase_complete") {
    return (
      <FastQuestionsCompletion
        onContinue={() => {
          window.dispatchEvent(
            new CustomEvent("weft:phase-one-continue", { detail: { eventId } }),
          );
        }}
      />
    );
  }

  const round = session.rounds[session.roundIndex];
  const activeParticipant = session.participants[session.participantIndex];
  const activeTurnLabel = turnLabel(activeParticipant.firstName, activeParticipant.isCurrentUser);
  const announcement = `Round ${session.roundIndex + 1} of ${session.rounds.length}. ${activeTurnLabel}.`;
  const visualKey = `${viewState ?? "loading"}-${round.id}-${activeParticipant.id}`;
  const fadeDuration = reducedMotion ? 0.01 : 0.22;

  return (
    <main className={styles.shell}>
      <p aria-live="polite" data-fast-questions-announcement style={visuallyHidden}>
        {announcement}
      </p>
      <AnimatePresence mode="wait">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className={styles.frame}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
          key={visualKey}
          transition={{ duration: fadeDuration, ease: "easeOut" }}
        >
          <Image alt="" aria-hidden className={styles.mark} height={42} src="/icon.svg" width={42} />
          <p className={styles.phaseLabel}>Phase 1 · Fast questions</p>
          <p className={styles.roundLabel}>Round {session.roundIndex + 1} of {session.rounds.length}</p>
          <QuestionDisplay round={round} />
          <p className={styles.activeParticipantLabel}>{activeTurnLabel}</p>
          <div className={styles.timer}>
            <CircularTimer
              durationSeconds={round.participantDurationSeconds}
              remainingMilliseconds={remainingMilliseconds}
              running={Boolean(timerEndsAt) && !readingGapOpen}
            />
          </div>
          <ParticipantList
            activeParticipantId={activeParticipant.id}
            participants={session.participants}
          />
          <p className={styles.guidance}>
            <span aria-hidden className={styles.guidanceIcon}>✦</span>
            <span>
              Everyone gets {round.participantDurationSeconds} seconds to respond. Be honest, be concise, be you.
            </span>
          </p>
          <RoundProgress currentRoundIndex={session.roundIndex} />
        </motion.section>
      </AnimatePresence>
    </main>
  );
}
