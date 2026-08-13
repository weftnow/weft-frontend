export type GroupRevealLanguage = "en" | "es";

export const groupRevealMessages = {
  en: {
    waiting: "Weft is preparing your group.",
    waitingDetail: "Keep this page open. Your table will appear here shortly.",
    countdown: "Your circle appears in {seconds}",
    unavailable: "Group details are unavailable.",
    retry: "Try again",
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
    unavailable: "Los detalles del grupo no están disponibles.",
    retry: "Intentar de nuevo",
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

export function groupRevealLanguageFor(value: string | undefined): GroupRevealLanguage {
  return value?.toLowerCase().startsWith("es") ? "es" : "en";
}
