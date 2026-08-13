import type { Language } from "../schemas/questionnaire.contract.schema";

export type QuestionnaireMessages = {
  openingEyebrow: string;
  openingTitle: string;
  openingSubtitle: string;
  welcome: string;
  english: string;
  spanish: string;
  start: string;
  continue: string;
  skip: string;
  sendAnswer: string;
  retry: string;
  missingLinkTitle: string;
  missingLinkBody: string;
  invalidLinkTitle: string;
  invalidLinkBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  notAcceptingTitle: string;
  notAcceptingBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  versionReset: string;
  validationError: string;
  idempotencyConflict: string;
  submissionFailed: string;
  skipped: string;
  completionMessages: [string, string];
  continueToConversation: string;
};

export const questionnaireMessages = {
  en: {
    openingEyebrow: "Weft questionnaire",
    openingTitle: "Let’s get to know you",
    openingSubtitle: "This helps us introduce you to the right people in the room.",
    welcome: "Hi, I’m Weft. I’ll ask you a few quick questions to help find your people.",
    english: "English",
    spanish: "Español",
    start: "Start",
    continue: "Continue",
    skip: "Skip",
    sendAnswer: "Send answer",
    retry: "Try again",
    missingLinkTitle: "Open your event link",
    missingLinkBody: "Use the link or QR code shared by the event organizer.",
    invalidLinkTitle: "This event link isn’t valid",
    invalidLinkBody: "Ask the event organizer for a new link or QR code.",
    notFoundTitle: "We couldn’t find this event",
    notFoundBody: "Check the link with the event organizer.",
    // The form closes when the host locks the room and does not reopen, so
    // this cannot say "try again in a moment" — there is nothing to wait for.
    notAcceptingTitle: "The event has already started",
    notAcceptingBody: "Sign-ups for tonight are closed. Join us early next time!",
    unavailableTitle: "This questionnaire isn’t available right now",
    unavailableBody: "Check the event link or try again in a moment.",
    versionReset: "The questionnaire was updated, so we need to start this draft again.",
    validationError: "That answer needs another look. Please update it and try again.",
    idempotencyConflict: "We couldn’t safely confirm this submission. Your answers are still saved.",
    submissionFailed: "We couldn’t finish your submission. Your answers are safe on this device.",
    skipped: "Skipped",
    completionMessages: [
      "You’re all set.",
      "Thanks. We’ll use your answers to introduce you to the right people.",
    ],
    continueToConversation: "Go to your conversation",
  },
  es: {
    openingEyebrow: "Cuestionario Weft",
    openingTitle: "Queremos conocerte",
    openingSubtitle: "Esto nos ayuda a presentarte a las personas indicadas en el evento.",
    welcome: "Hola, soy Weft. Te haré unas preguntas rápidas para ayudarte a encontrar a tu gente.",
    english: "English",
    spanish: "Español",
    start: "Comenzar",
    continue: "Continuar",
    skip: "Omitir",
    sendAnswer: "Enviar respuesta",
    retry: "Intentar de nuevo",
    missingLinkTitle: "Abre el enlace de tu evento",
    missingLinkBody: "Usa el enlace o código QR compartido por la organización del evento.",
    invalidLinkTitle: "Este enlace del evento no es válido",
    invalidLinkBody: "Pide un nuevo enlace o código QR a la organización del evento.",
    notFoundTitle: "No encontramos este evento",
    notFoundBody: "Confirma el enlace con la organización del evento.",
    notAcceptingTitle: "El evento ya comenzó",
    notAcceptingBody: "Las inscripciones de esta noche están cerradas. ¡Únete más temprano la próxima vez!",
    unavailableTitle: "Este cuestionario no está disponible ahora",
    unavailableBody: "Revisa el enlace del evento o intenta de nuevo en un momento.",
    versionReset: "El cuestionario cambió, así que necesitamos comenzar este borrador de nuevo.",
    validationError: "Necesitamos revisar esa respuesta. Actualízala e intenta de nuevo.",
    idempotencyConflict: "No pudimos confirmar este envío de forma segura. Tus respuestas siguen guardadas.",
    submissionFailed: "No pudimos finalizar el envío. Tus respuestas están seguras en este dispositivo.",
    skipped: "Omitida",
    completionMessages: [
      "Todo listo.",
      "Gracias. Usaremos tus respuestas para presentarte a las personas indicadas.",
    ],
    continueToConversation: "Ir a tu conversación",
  },
} satisfies Record<Language, QuestionnaireMessages>;

export function messagesFor(language: Language): QuestionnaireMessages {
  return questionnaireMessages[language];
}
