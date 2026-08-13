"use client";

import { type Query, useQuery } from "@tanstack/react-query";
import {
  conversationApi as defaultApi,
  FastQuestionsApiError,
} from "../fastQuestions/api/fastQuestions.api";
import type { ConversationApi, ConversationSession } from "../types/conversation.types";

const POLL_INTERVAL_MS = 1_500;

/**
 * The one failure worth stopping for. Every other error here is something a
 * later poll might resolve — the host has not started yet, the backend blipped
 * — but a guest who was never seated will not be seated later, so polling on
 * is a request every 1.5 seconds for an answer that cannot change.
 */
function isTerminal(error: unknown): boolean {
  return error instanceof FastQuestionsApiError && error.code === "too_late";
}

/**
 * One key for the whole conversation. Both slices read it, so however many
 * hooks are mounted there is still one cache entry and one request in flight.
 */
export function conversationQueryKey(eventId: string) {
  return ["conversation", eventId] as const;
}

export type UseConversationSessionOptions = {
  api?: ConversationApi;
};

export type UseConversationSessionResult = {
  session: ConversationSession | null;
  isLoading: boolean;
  error: unknown;
  retry(): void;
};

export function useConversationSession(
  eventId: string,
  { api = defaultApi }: UseConversationSessionOptions = {},
): UseConversationSessionResult {
  const query = useQuery({
    queryKey: conversationQueryKey(eventId),
    queryFn: () => api.getConversationSession(eventId),
    // Mirrors ConversationProvider's `retry: 2` rather than replacing it —
    // this overrides the default, so the count has to be restated here.
    retry: (failureCount, error) => !isTerminal(error) && failureCount < 2,
    refetchInterval: (activeQuery: Query<ConversationSession>) => {
      if (isTerminal(activeQuery.state.error)) return false;
      const data = activeQuery.state.data;
      if (!data) return POLL_INTERVAL_MS;
      // A running Phase 1 turn is already polled by useFastQuestions, which
      // owns the turn clock; polling here too would double the traffic for one
      // screen.
      if (data.phaseId === "phase_1") return data.status === "active" ? false : POLL_INTERVAL_MS;
      // Phase 2 is polled so a group sitting on the transition screen follows
      // whoever tapped Continue, and so the seven-minute expiry is noticed.
      return data.status === "complete" ? false : POLL_INTERVAL_MS;
    },
  });

  return {
    session: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    retry: () => void query.refetch(),
  };
}
