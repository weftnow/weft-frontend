"use client";

import type { QuestionnaireClient } from "../api/client/questionnaire.client";
import { useQuestionnaireController } from "../hooks/useQuestionnaireController";
import { messagesFor } from "../i18n/questionnaire.messages";
import type { QuestionnaireStorage } from "../persistence/questionnaire.storage";
import type { Questionnaire as QuestionnaireModel } from "../types/questionnaire.types";
import { QuestionnaireCompletion } from "./QuestionnaireCompletion";
import { QuestionnaireFlow, type QuestionnaireTimings } from "./QuestionnaireFlow";
import { QuestionnaireNotice } from "./QuestionnaireNotice";
import { QuestionnaireOpening } from "./QuestionnaireOpening";

export type QuestionnaireProps = {
  formToken: string;
  initialQuestionnaire: QuestionnaireModel;
  client?: QuestionnaireClient;
  storage?: QuestionnaireStorage;
  timings?: Partial<QuestionnaireTimings>;
};

const DEFAULT_TIMINGS: QuestionnaireTimings = {
  conversationalPauseMs: 240,
  transitionDelayMs: 220,
};

export function Questionnaire({
  formToken,
  initialQuestionnaire,
  client,
  storage,
  timings,
}: QuestionnaireProps) {
  const controller = useQuestionnaireController(
    formToken,
    initialQuestionnaire,
    client,
    storage,
  );
  const resolvedTimings = { ...DEFAULT_TIMINGS, ...timings };

  if (controller.view === "hydrating") {
    return (
      <QuestionnaireNotice
        eventName={initialQuestionnaire.eventName}
        kind="loading"
        language={initialQuestionnaire.language}
      />
    );
  }
  if (controller.view === "opening") {
    return (
      <QuestionnaireOpening questionnaire={initialQuestionnaire} onStart={controller.start} />
    );
  }
  if (controller.view === "completed") {
    return (
      <QuestionnaireCompletion
        eventId={initialQuestionnaire.eventId}
        eventName={initialQuestionnaire.eventName}
        language={controller.language}
      />
    );
  }
  if (controller.view === "unavailable" || !controller.result) {
    return <QuestionnaireNotice kind="notAccepting" language={controller.language} />;
  }

  return (
    <QuestionnaireFlow
      completeQuestionnaire={controller.completeQuestionnaire}
      messages={messagesFor(controller.result.questionnaire.language)}
      result={controller.result}
      submitAnswer={controller.submitAnswer}
      timings={resolvedTimings}
    />
  );
}
