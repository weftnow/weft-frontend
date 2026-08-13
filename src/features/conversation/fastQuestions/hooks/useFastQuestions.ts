"use client";

import { useEffect, useRef, useState } from "react";
import { type Query, useQuery, useQueryClient } from "@tanstack/react-query";
import { conversationQueryKey } from "../../hooks/useConversationSession";
import type { ConversationApi, ConversationSession } from "../../types/conversation.types";
import { conversationApi as defaultApi } from "../api/fastQuestions.api";
import type { FastQuestionsSession, FastQuestionsViewState } from "../types/fastQuestions.types";

const POLL_INTERVAL_MS = 1_500;
const TRANSITION_SETTLE_MS = 360;

const SETTLING_VIEW_STATES: ReadonlySet<FastQuestionsViewState> = new Set([
  "round_intro",
  "participant_transition",
  "round_transition",
]);

/**
 * Maps a canonical session transition to the visual state the UI should
 * render. Driven entirely by identity changes in server-provided fields
 * (status/roundIndex/participantIndex) — never by locally computed indices.
 */
export function resolveViewState(
  previous: FastQuestionsSession | null,
  next: FastQuestionsSession,
): FastQuestionsViewState {
  if (next.status === "phase_complete") return "phase_complete";
  if (!previous || previous.status === "waiting") return "round_intro";
  if (previous.roundIndex !== next.roundIndex) return "round_transition";
  if (previous.participantIndex !== next.participantIndex) {
    return "participant_transition";
  }
  return "participant_active";
}

export type UseFastQuestionsOptions = {
  api?: ConversationApi;
  /** Overridable only for tests; production callers should rely on the default. */
  transitionSettleMs?: number;
};

export type UseFastQuestionsResult = {
  session: FastQuestionsSession | null;
  viewState: FastQuestionsViewState | null;
  isLoading: boolean;
  isStarting: boolean;
  error: unknown;
  retry(): void;
  startPhase(): void;
  advanceParticipantTurn(): Promise<void>;
};

export function useFastQuestions(
  eventId: string,
  { api = defaultApi, transitionSettleMs = TRANSITION_SETTLE_MS }: UseFastQuestionsOptions = {},
): UseFastQuestionsResult {
  const queryClient = useQueryClient();
  const queryKey = conversationQueryKey(eventId);

  const query = useQuery({
    queryKey,
    queryFn: () => api.getConversationSession(eventId),
    refetchInterval: (activeQuery: Query<ConversationSession>) => {
      const data = activeQuery.state.data;
      return data?.phaseId === "phase_1" && data.status === "active" ? POLL_INTERVAL_MS : false;
    },
  });

  // This hook is Phase 1 only. The router never mounts it for a phase-2
  // session, and narrowing rather than asserting keeps that true by
  // construction if it ever does.
  const session: FastQuestionsSession | null =
    query.data?.phaseId === "phase_1" ? query.data : null;

  const previousSessionRef = useRef<FastQuestionsSession | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewState, setViewState] = useState<FastQuestionsViewState | null>(null);

  // Resolve the visual state whenever the canonical session identity changes,
  // and settle transient transition states back to `participant_active` after
  // a fixed delay. One timeout is ever in flight; it is always cleared before
  // a new one is scheduled and on unmount, so timers never leak or stack.
  useEffect(() => {
    if (!session) return;
    // A waiting session has no turn to visualise — the lobby owns that screen.
    // Leaving `viewState` null here is what makes the first resolved state
    // after Start a real `round_intro` rather than a replay of one that
    // already settled while the group was still gathering.
    if (session.status === "waiting") return;

    const previous = previousSessionRef.current;
    const next = resolveViewState(previous, session);
    previousSessionRef.current = session;

    if (settleTimeoutRef.current !== null) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }

    setViewState(next);

    if (SETTLING_VIEW_STATES.has(next)) {
      settleTimeoutRef.current = setTimeout(() => {
        settleTimeoutRef.current = null;
        setViewState("participant_active");
      }, transitionSettleMs);
    }
  }, [session, transitionSettleMs]);

  useEffect(
    () => () => {
      if (settleTimeoutRef.current !== null) clearTimeout(settleTimeoutRef.current);
    },
    [],
  );

  // Start is a deliberate tap, never an effect. The backend stamps
  // `started_at` on the group's row and runs every turn clock from it
  // (app/services/icebreaker_runner.py), so whoever fires this starts the
  // round for the whole table — firing it on mount would burn turns while
  // people are still walking over. Phones that did not tap follow along
  // because `useConversationSession` polls a non-active phase-1 session.
  //
  // Five phones tapping at once is already safe on the server — the endpoint
  // is idempotent and the row is locked. This ref only stops one phone firing
  // a second request before the first has answered.
  const startInFlightRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<unknown>(null);

  function startPhase(): void {
    if (!session || session.status !== "waiting") return;
    if (startInFlightRef.current) return;

    startInFlightRef.current = true;
    setIsStarting(true);
    api
      .startFastQuestionsPhase(eventId)
      .then((result) => {
        setStartError(null);
        queryClient.setQueryData(queryKey, result);
      })
      .catch((caughtError: unknown) => {
        setStartError(caughtError);
      })
      .finally(() => {
        startInFlightRef.current = false;
        setIsStarting(false);
      });
  }

  async function advanceParticipantTurn(): Promise<void> {
    if (!session) return;
    const result = await api.advanceParticipantTurn(eventId, {
      roundIndex: session.roundIndex,
      participantIndex: session.participantIndex,
    });
    queryClient.setQueryData(queryKey, result);
  }

  function retry(): void {
    setStartError(null);
    void query.refetch();
  }

  return {
    session,
    viewState,
    isLoading: query.isLoading,
    isStarting,
    error: query.error ?? startError,
    retry,
    startPhase,
    advanceParticipantTurn,
  };
}
