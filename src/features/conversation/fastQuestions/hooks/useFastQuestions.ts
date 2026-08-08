"use client";

import { useEffect, useRef, useState } from "react";
import { type Query, useQuery, useQueryClient } from "@tanstack/react-query";
import { fastQuestionsApi as defaultApi } from "../api/fastQuestions.api";
import type {
  FastQuestionsApi,
  FastQuestionsSession,
  FastQuestionsViewState,
} from "../types/fastQuestions.types";

const POLL_INTERVAL_MS = 1_500;
const TRANSITION_SETTLE_MS = 360;

const SETTLING_VIEW_STATES: ReadonlySet<FastQuestionsViewState> = new Set([
  "round_intro",
  "participant_transition",
  "round_transition",
]);

export function fastQuestionsQueryKey(eventId: string) {
  return ["fastQuestions", eventId] as const;
}

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
  api?: FastQuestionsApi;
  /** Overridable only for tests; production callers should rely on the default. */
  transitionSettleMs?: number;
};

export type UseFastQuestionsResult = {
  session: FastQuestionsSession | null;
  viewState: FastQuestionsViewState | null;
  isLoading: boolean;
  error: unknown;
  retry(): void;
  advanceParticipantTurn(): Promise<void>;
};

export function useFastQuestions(
  eventId: string,
  { api = defaultApi, transitionSettleMs = TRANSITION_SETTLE_MS }: UseFastQuestionsOptions = {},
): UseFastQuestionsResult {
  const queryClient = useQueryClient();
  const queryKey = fastQuestionsQueryKey(eventId);

  const query = useQuery({
    queryKey,
    queryFn: () => api.getConversationSession(eventId),
    refetchInterval: (activeQuery: Query<FastQuestionsSession>) =>
      activeQuery.state.data?.status === "active" ? POLL_INTERVAL_MS : false,
  });

  const session = query.data ?? null;

  const previousSessionRef = useRef<FastQuestionsSession | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewState, setViewState] = useState<FastQuestionsViewState | null>(null);

  // Resolve the visual state whenever the canonical session identity changes,
  // and settle transient transition states back to `participant_active` after
  // a fixed delay. One timeout is ever in flight; it is always cleared before
  // a new one is scheduled and on unmount, so timers never leak or stack.
  useEffect(() => {
    if (!session) return;

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

  // Idempotently start the phase whenever the canonical session is `waiting`.
  // The in-flight ref prevents double-firing while the request is pending;
  // once the cache is replaced with a non-waiting session this effect's
  // dependency (`session`) changes identity and the guard body no-ops.
  //
  // `startAttempt` exists solely so `retry()` can force one more attempt: if
  // `startFastQuestionsPhase` fails and a later refetch happens to return a
  // structurally identical `waiting` payload, TanStack Query's structural
  // sharing keeps `session` referentially the same, so the effect would
  // otherwise never re-run on its own.
  const startInFlightRef = useRef(false);
  const [startAttempt, setStartAttempt] = useState(0);
  const [startError, setStartError] = useState<unknown>(null);
  useEffect(() => {
    if (!session || session.status !== "waiting") return;
    if (startInFlightRef.current) return;

    startInFlightRef.current = true;
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
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, eventId, startAttempt]);

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
    setStartAttempt((attempt) => attempt + 1);
    void query.refetch();
  }

  return {
    session,
    viewState,
    isLoading: query.isLoading,
    error: query.error ?? startError,
    retry,
    advanceParticipantTurn,
  };
}
