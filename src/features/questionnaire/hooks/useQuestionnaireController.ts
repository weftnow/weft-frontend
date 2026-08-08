"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  QuestionnaireClientError,
  questionnaireClient as defaultClient,
  type QuestionnaireClient,
} from "../api/client/questionnaire.client";
import {
  questionnaireReducer,
  selectQuestionnaireResult,
  type QuestionnaireAction,
  type QuestionnaireState,
  type QuestionnaireViewResult,
} from "../model/questionnaire.reducer";
import { buildFormSubmission } from "../model/questionnaire.submission";
import {
  hydrateDraft,
  readDraft,
  toDraftRecord,
  writeCompleted,
  writeDraft,
  type QuestionnaireStorage,
} from "../persistence/questionnaire.storage";
import type { Language } from "../schemas/questionnaire.contract.schema";
import type {
  Questionnaire,
  QuestionnaireClientErrorData,
  SubmitAnswerInput,
} from "../types/questionnaire.types";

export type QuestionnaireControllerView =
  | "hydrating"
  | "opening"
  | "conversation"
  | "completed"
  | "unavailable";

export class QuestionnaireCompletionError extends Error {
  constructor(
    readonly data: QuestionnaireClientErrorData,
    readonly result: QuestionnaireViewResult,
  ) {
    super(data.code);
    this.name = "QuestionnaireCompletionError";
  }
}

export type QuestionnaireController = {
  view: QuestionnaireControllerView;
  result: QuestionnaireViewResult | null;
  language: Language;
  error: QuestionnaireClientErrorData | null;
  start(language: Language): Promise<void>;
  submitAnswer(input: SubmitAnswerInput): Promise<QuestionnaireViewResult>;
  completeQuestionnaire(): Promise<QuestionnaireViewResult>;
  retryCompletion(): Promise<QuestionnaireViewResult>;
};

function isNotAccepting(questionnaire: Questionnaire): boolean {
  return !questionnaire.acceptingSubmissions;
}

export function useQuestionnaireController(
  formToken: string,
  initialQuestionnaire: Questionnaire,
  client: QuestionnaireClient = defaultClient,
  storage?: QuestionnaireStorage,
): QuestionnaireController {
  const stateRef = useRef<QuestionnaireState | null>(null);
  const [state, setState] = useState<QuestionnaireState | null>(null);
  const [view, setView] = useState<QuestionnaireControllerView>("hydrating");
  const [completedLanguage, setCompletedLanguage] = useState<Language>(
    initialQuestionnaire.language,
  );
  const [error, setError] = useState<QuestionnaireClientErrorData | null>(null);

  const commit = useCallback(
    (action: QuestionnaireAction): QuestionnaireViewResult => {
      const current = stateRef.current;
      if (!current) throw new Error("Questionnaire is not hydrated yet");
      const next = questionnaireReducer(current, action);
      stateRef.current = next;
      setState(next);
      if (next.status === "completed") {
        writeCompleted(formToken, next, storage);
      } else {
        writeDraft(formToken, toDraftRecord(next), storage);
      }
      return selectQuestionnaireResult(next);
    },
    [formToken, storage],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const record = readDraft(formToken, storage);
      const outcome = hydrateDraft(initialQuestionnaire, record);

      if (outcome.kind === "completed") {
        if (cancelled) return;
        setCompletedLanguage(outcome.language);
        setView("completed");
        return;
      }

      let nextState = outcome.state;

      // hydrateDraft's "resumed" state always carries the server-loaded
      // initial definition (it has no way to fetch a translation), so the
      // stored record — not nextState.questionnaire — is the source of truth
      // for which language this draft actually needs.
      if (
        outcome.kind === "resumed" &&
        record &&
        record.language !== initialQuestionnaire.language
      ) {
        try {
          const questionnaire = await client.loadLanguage(formToken, record.language);
          nextState = { ...nextState, questionnaire };
        } catch {
          if (cancelled) return;
          setError({ code: "unavailable" });
          setView("unavailable");
          return;
        }
      }

      if (cancelled) return;

      stateRef.current = nextState;
      setState(nextState);

      if (isNotAccepting(nextState.questionnaire)) {
        setCompletedLanguage(nextState.questionnaire.language);
        setView("unavailable");
        return;
      }

      setView(
        outcome.kind === "fresh" || outcome.kind === "versionReset"
          ? "opening"
          : "conversation",
      );
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
    // formToken/initialQuestionnaire/client/storage are stable for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formToken]);

  const start = useCallback(
    async (language: Language) => {
      const current = stateRef.current;
      if (!current) return;
      if (language !== current.questionnaire.language) {
        const questionnaire = await client.loadLanguage(formToken, language);
        commit({ type: "definitionReplaced", questionnaire });
      }
      commit({ type: "started" });
      setView("conversation");
    },
    [client, commit, formToken],
  );

  const submitAnswer = useCallback(
    async (input: SubmitAnswerInput): Promise<QuestionnaireViewResult> =>
      commit({ type: "answerAccepted", questionId: input.questionId, value: input.value }),
    [commit],
  );

  const completeQuestionnaire = useCallback(async (): Promise<QuestionnaireViewResult> => {
    const current = stateRef.current;
    if (!current) throw new Error("Questionnaire is not ready");

    const body = buildFormSubmission(current.questionnaire, current.answers);
    commit({ type: "submissionStarted" });

    try {
      await client.submit(formToken, current.submissionId, body);
    } catch (submitError) {
      const data: QuestionnaireClientErrorData =
        submitError instanceof QuestionnaireClientError
          ? submitError.data
          : { code: "unavailable" };

      if (data.code === "versionConflict") {
        const questionnaire = await client.loadLanguage(
          formToken,
          current.questionnaire.language,
        );
        const result = commit({
          type: "versionReset",
          questionnaire,
          submissionId: crypto.randomUUID(),
        });
        setView("opening");
        throw new QuestionnaireCompletionError(data, result);
      }

      const result = commit({ type: "submissionFailed", error: data });
      setError(data);
      throw new QuestionnaireCompletionError(data, result);
    }

    const result = commit({ type: "submissionSucceeded" });
    setCompletedLanguage(result.questionnaire.language);
    setView("completed");
    return result;
  }, [client, commit, formToken]);

  const retryCompletion = useCallback(
    () => completeQuestionnaire(),
    [completeQuestionnaire],
  );

  return {
    view,
    result: state ? selectQuestionnaireResult(state) : null,
    language: state?.questionnaire.language ?? completedLanguage,
    error,
    start,
    submitAnswer,
    completeQuestionnaire,
    retryCompletion,
  };
}
