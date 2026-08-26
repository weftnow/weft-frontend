/**
 * Every attendee-facing string on the feedback screen, in both languages the
 * event runs in.
 *
 * Spanish is natural Latin American "tú", matching the conversation and the
 * questionnaire.
 */

import type { ConversationLanguage } from "@/features/conversation/i18n/conversation.messages";
import type { PlatformPreference } from "../schemas/eventFeedback.schema";

/** Brand names. The same in both languages, on purpose. */
const PLATFORM_NAMES: Record<PlatformPreference, string> = {
  gomatch: "GoMatch",
  weft: "Weft",
};

export type EventFeedbackMessages = {
  heading: string;
  recommendQuestion: string;
  scaleHint: string;
  recommendLow: string;
  recommendHigh: string;
  recommendOption(score: number): string;
  ratingQuestion: string;
  ratingLow: string;
  ratingHigh: string;
  ratingOption(rating: number): string;
  platformQuestion: string;
  /** The brand names themselves, so neither is translated by accident. */
  platformOptionLabel(platform: PlatformPreference): string;
  platformOption(platform: PlatformPreference, selected: boolean): string;
  meetAgainQuestion: string;
  meetAgainHint: string;
  meetAgainOption(name: string, selected: boolean): string;
  improvementQuestion: string;
  improvementPlaceholder: string;
  submit: string;
  submitting: string;
  incomplete: string;
  failed: string;
  retry: string;
  thanksHeading: string;
  thanksBody: string;
  noLink: string;
  /**
   * Shown when the server has no data source configured. Says nothing about
   * trying again, because trying again is not what fixes it.
   */
  unavailable: string;
};

export const eventFeedbackMessages = {
  en: {
    heading: "Before you go",
    recommendQuestion: "How likely are you to recommend Weft to a friend?",
    scaleHint: "1 is the lowest, 5 is the highest.",
    recommendLow: "1 · Not likely",
    recommendHigh: "5 · Very likely",
    recommendOption: (score) => `${score} out of 5`,
    ratingQuestion: "Did you enjoy the session today?",
    ratingLow: "1 · Not really",
    ratingHigh: "5 · Loved it",
    ratingOption: (rating) => `${rating} out of 5`,
    platformQuestion: "Which matching platform today do you prefer?",
    platformOptionLabel: (platform) => PLATFORM_NAMES[platform],
    platformOption: (platform, selected) =>
      `${PLATFORM_NAMES[platform]}, ${selected ? "selected" : "not selected"}`,
    meetAgainQuestion: "Anyone here you’d like to meet again?",
    meetAgainHint: "Tap everyone you’d like to see again. Skip if nobody.",
    meetAgainOption: (name, selected) =>
      `${name}, ${selected ? "would like to meet again" : "not selected"}`,
    improvementQuestion: "What could we do better?",
    improvementPlaceholder: "Tell us anything.",
    submit: "Send",
    submitting: "Sending…",
    incomplete: "Answer all four to send.",
    failed: "We couldn’t send that. Your answers are still here — try again.",
    retry: "Try again",
    thanksHeading: "Thanks.",
    thanksBody: "This is how the next one gets better.",
    noLink: "Open this from your own event link to leave feedback.",
    unavailable: "Feedback isn’t available for this event. That’s on us, not you — nothing here to retry.",
  },
  es: {
    heading: "Antes de irte",
    recommendQuestion: "¿Qué tan probable es que le recomiendes Weft a un amigo?",
    scaleHint: "1 es lo más bajo, 5 lo más alto.",
    recommendLow: "1 · Poco probable",
    recommendHigh: "5 · Muy probable",
    recommendOption: (score) => `${score} de 5`,
    ratingQuestion: "¿Disfrutaste la sesión de hoy?",
    ratingLow: "1 · La verdad no",
    ratingHigh: "5 · Me encantó",
    ratingOption: (rating) => `${rating} de 5`,
    platformQuestion: "¿Qué plataforma de matching prefieres hoy?",
    platformOptionLabel: (platform) => PLATFORM_NAMES[platform],
    platformOption: (platform, selected) =>
      `${PLATFORM_NAMES[platform]}, ${selected ? "seleccionada" : "sin seleccionar"}`,
    meetAgainQuestion: "¿Hay alguien aquí que te gustaría volver a ver?",
    meetAgainHint: "Toca a quien quieras volver a ver. Sáltalo si nadie.",
    meetAgainOption: (name, selected) =>
      `${name}, ${selected ? "te gustaría volver a verle" : "sin seleccionar"}`,
    improvementQuestion: "¿Qué podríamos mejorar?",
    improvementPlaceholder: "Cuéntanos lo que sea.",
    submit: "Enviar",
    submitting: "Enviando…",
    incomplete: "Responde las cuatro para enviar.",
    failed: "No pudimos enviarlo. Tus respuestas siguen aquí — inténtalo de nuevo.",
    retry: "Intentar de nuevo",
    thanksHeading: "Gracias.",
    thanksBody: "Así mejora la próxima.",
    noLink: "Abre esto desde tu propio enlace del evento para dejar tu opinión.",
    unavailable: "La sección de opiniones no está disponible para este evento. Es cosa nuestra, no tuya — no hay nada que reintentar.",
  },
} satisfies Record<ConversationLanguage, EventFeedbackMessages>;

export function eventFeedbackMessagesFor(
  language: ConversationLanguage,
): EventFeedbackMessages {
  return eventFeedbackMessages[language];
}
