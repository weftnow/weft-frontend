"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { conversationApi as defaultApi } from "../fastQuestions/api/fastQuestions.api";
import { FastQuestionsExperience } from "../fastQuestions/components/FastQuestions";
import { FastQuestionsCompletion } from "../fastQuestions/components/FastQuestionsCompletion";
import { FastQuestionsNotice } from "../fastQuestions/components/FastQuestionsNotice";
import { conversationQueryKey, useConversationSession } from "../hooks/useConversationSession";
import { SharedChallenge } from "../sharedChallenge/components/SharedChallenge";
import { SharedChallengeComplete } from "../sharedChallenge/components/SharedChallengeComplete";
import type { ConversationApi } from "../types/conversation.types";

export type ConversationRouterProps = {
  eventId: string;
  api?: ConversationApi;
  /** Overridable only for tests; production callers should rely on the default. */
  transitionSettleMs?: number;
};

/**
 * The session has exactly four states and each maps to one screen. Routing on
 * the real state is what stops a group that reloads mid-discussion being sent
 * back to the transition screen they already passed — a fix by construction
 * rather than by special case.
 */
export function ConversationRouter({
  api = defaultApi,
  eventId,
  transitionSettleMs,
}: ConversationRouterProps) {
  const queryClient = useQueryClient();
  const { error, isLoading, retry, session } = useConversationSession(eventId, { api });
  const continueInFlightRef = useRef(false);
  const [continueError, setContinueError] = useState<unknown>(null);

  function handleContinue() {
    // Five phones tapping at once is already safe on the server — the endpoint
    // is idempotent and the row is locked. This ref only stops one phone
    // firing a second request before the first has answered.
    if (continueInFlightRef.current) return;
    continueInFlightRef.current = true;
    api
      .continueToPhaseTwo(eventId)
      .then((result) => {
        setContinueError(null);
        queryClient.setQueryData(conversationQueryKey(eventId), result);
      })
      .catch((caught: unknown) => {
        setContinueError(caught);
      })
      .finally(() => {
        continueInFlightRef.current = false;
      });
  }

  function handleRetry() {
    setContinueError(null);
    retry();
  }

  if (error ?? continueError) {
    return (
      <FastQuestionsNotice
        language={session?.language}
        onRetry={handleRetry}
        status="error"
      />
    );
  }
  if (!session || isLoading) return <FastQuestionsNotice status="loading" />;

  if (session.phaseId === "phase_2") {
    return session.status === "complete" ? (
      <SharedChallengeComplete
        closingLine={session.closingLine}
        eventId={session.eventId}
        language={session.language}
      />
    ) : (
      <SharedChallenge session={session} />
    );
  }

  if (session.status === "phase_complete") {
    return <FastQuestionsCompletion language={session.language} onContinue={handleContinue} />;
  }

  return (
    <FastQuestionsExperience
      api={api}
      eventId={eventId}
      transitionSettleMs={transitionSettleMs}
    />
  );
}
