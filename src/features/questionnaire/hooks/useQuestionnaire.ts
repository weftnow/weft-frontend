"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  questionnaireApi,
  type QuestionnaireApi,
} from "../api/questionnaire.api";

export const QUESTIONNAIRE_QUERY_KEY = ["attendee-questionnaire"] as const;

export function useQuestionnaire(api: QuestionnaireApi = questionnaireApi) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUESTIONNAIRE_QUERY_KEY,
    queryFn: api.getQuestionnaire,
  });
  const submit = useMutation({
    mutationFn: api.submitAnswer,
    onSuccess: (result) => {
      queryClient.setQueryData(QUESTIONNAIRE_QUERY_KEY, result);
    },
  });
  const complete = useMutation({
    mutationFn: () => api.completeQuestionnaire(),
    onSuccess: (result) => {
      queryClient.setQueryData(QUESTIONNAIRE_QUERY_KEY, result);
    },
  });

  return {
    result: query.data,
    isLoading: query.isPending,
    error: query.error ?? submit.error ?? complete.error,
    submitAnswer: submit.mutateAsync,
    completeQuestionnaire: () => complete.mutateAsync(),
    isSubmitting: submit.isPending || complete.isPending,
    retry: query.refetch,
  };
}
