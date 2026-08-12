/**
 * Every attendee-facing string on the feedback screen, in both languages the
 * event runs in.
 *
 * Spanish is natural Latin American "tú", matching the conversation and the
 * questionnaire.
 */

import type { ConversationLanguage } from "@/features/conversation/i18n/conversation.messages";

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
    meetAgainQuestion: "Anyone here you’d like to meet again?",
    meetAgainHint: "Tap everyone you’d like to see again. Skip if nobody.",
    meetAgainOption: (name, selected) =>
      `${name}, ${selected ? "would like to meet again" : "not selected"}`,
    improvementQuestion: "What could we do better?",
    improvementPlaceholder: "Tell us anything.",
    submit: "Send",
    submitting: "Sending…",
    incomplete: "Answer all three to send.",
    failed: "We couldn’t send that. Your answers are still here — try again.",
    retry: "Try again",
    thanksHeading: "Thanks.",
    thanksBody: "This is how the next one gets better.",
    noLink: "Open this from your own event link to leave feedback.",
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
    meetAgainQuestion: "¿Hay alguien aquí que te gustaría volver a ver?",
    meetAgainHint: "Toca a quien quieras volver a ver. Sáltalo si nadie.",
    meetAgainOption: (name, selected) =>
      `${name}, ${selected ? "te gustaría volver a verle" : "sin seleccionar"}`,
    improvementQuestion: "¿Qué podríamos mejorar?",
    improvementPlaceholder: "Cuéntanos lo que sea.",
    submit: "Enviar",
    submitting: "Enviando…",
    incomplete: "Responde las tres para enviar.",
    failed: "No pudimos enviarlo. Tus respuestas siguen aquí — inténtalo de nuevo.",
    retry: "Intentar de nuevo",
    thanksHeading: "Gracias.",
    thanksBody: "Así mejora la próxima.",
    noLink: "Abre esto desde tu propio enlace del evento para dejar tu opinión.",
  },
} satisfies Record<ConversationLanguage, EventFeedbackMessages>;

export function eventFeedbackMessagesFor(
  language: ConversationLanguage,
): EventFeedbackMessages {
  return eventFeedbackMessages[language];
}
