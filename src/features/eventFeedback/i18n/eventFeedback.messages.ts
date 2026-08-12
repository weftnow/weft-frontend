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
  recommendLow: string;
  recommendHigh: string;
  recommendOption(score: number): string;
  ratingQuestion: string;
  ratingOption(rating: number): string;
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
    recommendLow: "Not likely",
    recommendHigh: "Very likely",
    recommendOption: (score) => `${score} out of 10`,
    ratingQuestion: "How was tonight?",
    ratingOption: (rating) => `${rating} out of 5`,
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
    recommendLow: "Poco probable",
    recommendHigh: "Muy probable",
    recommendOption: (score) => `${score} de 10`,
    ratingQuestion: "¿Cómo estuvo esta noche?",
    ratingOption: (rating) => `${rating} de 5`,
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
