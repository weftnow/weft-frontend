export type GroupRevealLanguage = "en" | "es";

export const groupRevealMessages = {
  en: {
    waiting: "Weft is preparing your group.",
    waitingDetail: "Keep this page open. Your table will appear here shortly.",
    countdown: "Your circle appears in {seconds}",
    errorEyebrow: "Weft questionnaire",
    unavailableTitle: "We couldn't load your group right now.",
    unavailableBody: "Your submitted answers are safe. Please try again in a moment.",
    retry: "Try again",
    missingSessionTitle: "We couldn't find your saved session.",
    missingSessionBody: "Return to the questionnaire to continue.",
    restartQuestionnaire: "Return to questionnaire",
    matchComplete: "Match complete",
    connections: "connections",
    circleReady: "Your circle is ready.",
    table: "Table",
    foundGroup: "I found my group",
    starting: "Starting…",
    startConversation: "Start guided conversations",
    confirmationError: "We couldn't confirm your group yet. Please try again.",
  },
  es: {
    waiting: "Weft está preparando tu grupo.",
    waitingDetail: "Mantén esta página abierta. Tu mesa aparecerá pronto.",
    countdown: "Tu círculo aparece en {seconds}",
    errorEyebrow: "Cuestionario de Weft",
    unavailableTitle: "No pudimos cargar tu grupo ahora.",
    unavailableBody: "Tus respuestas enviadas están seguras. Inténtalo de nuevo en un momento.",
    retry: "Intentar de nuevo",
    missingSessionTitle: "No pudimos encontrar tu sesión guardada.",
    missingSessionBody: "Vuelve al cuestionario para continuar.",
    restartQuestionnaire: "Volver al cuestionario",
    matchComplete: "Grupo listo",
    connections: "conexiones",
    circleReady: "Tu círculo está listo.",
    table: "Mesa",
    foundGroup: "Encontré a mi grupo",
    starting: "Iniciando…",
    startConversation: "Iniciar conversaciones guiadas",
    confirmationError: "No pudimos confirmar tu grupo. Inténtalo de nuevo.",
  },
} as const;

export type GroupRevealMessages =
  (typeof groupRevealMessages)[GroupRevealLanguage];

export function groupRevealLanguageFor(value: string | undefined): GroupRevealLanguage {
  return value?.toLowerCase().startsWith("es") ? "es" : "en";
}
