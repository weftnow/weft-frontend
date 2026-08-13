/**
 * Every attendee-facing string the conversation renders, in both languages the
 * event runs in.
 *
 * The questions themselves are not here — the backend picks those per session
 * and sends the text already translated. What lives here is the chrome around
 * them: labels, guidance, screen-reader names and the two screens' copy.
 *
 * Spanish is natural Latin American "tú", matching the questionnaire.
 */

export type ConversationLanguage = "en" | "es";

export type ConversationMessages = {
  loading: string;
  invalidLink: string;
  /** Arrived before the host started the round — early, not broken. */
  notStarted: string;
  /**
   * The other side of `notStarted`, and the reason the two cannot share a
   * screen: the tables are already assigned and this guest is not at one, so
   * there is nothing to wait for. Latecomers are not seated (see the backend's
   * app/services/submissions.py), which is what makes this state terminal.
   */
  tooLate: string;
  syncError: string;
  retry: string;

  /**
   * The lobby. Start is one tap for the whole table — the backend stamps
   * `started_at` on the group's session and every turn clock runs from it — so
   * the copy has to say out loud that this is not a per-phone button.
   */
  readyHeading: string;
  readyBody: string;
  startLabel: string;
  starting: string;

  fastQuestionsPhaseLabel: string;
  roundOf(current: number, total: number): string;
  turnLabel(firstName: string, isCurrentUser: boolean): string;
  turnAnnouncement(round: number, total: number, turn: string): string;
  fastQuestionsGuidance(seconds: number): string;
  participants: string;
  participantActivity(firstName: string, active: boolean): string;
  roundProgress: string;
  progressCount(current: number, total: number): string;

  timeLeft: string;
  secondsRemaining(seconds: number): string;

  transitionHeading: string;
  transitionBody: string;
  continueLabel: string;

  sharedChallengePhaseLabel: string;
  sharedChallengeGuidance: string;
  challengeFallback: string;
  closingLineFallback: string;
};

export const conversationMessages = {
  en: {
    loading: "Preparing your conversation…",
    invalidLink: "This event link isn’t valid.",
    notStarted: "You’re all set. Your conversation opens once the host starts it.",
    tooLate: "The event has already started. Join us early next time!",
    syncError: "We couldn’t sync the conversation.",
    retry: "Retry",

    readyHeading: "Ready when you are.",
    readyBody:
      "Wait until everyone is at the table — one tap starts the clock for the whole group.",
    startLabel: "Start",
    starting: "Starting…",

    fastQuestionsPhaseLabel: "Phase 1 · Fast questions",
    roundOf: (current, total) => `Round ${current} of ${total}`,
    turnLabel: (firstName, isCurrentUser) =>
      isCurrentUser ? "Your turn" : `${firstName}’s turn`,
    turnAnnouncement: (round, total, turn) => `Round ${round} of ${total}. ${turn}.`,
    fastQuestionsGuidance: (seconds) =>
      `Everyone gets ${seconds} seconds to respond. Be honest, be concise, be you.`,
    participants: "Participants",
    participantActivity: (firstName, active) =>
      `${firstName}, ${active ? "currently responding" : "waiting"}`,
    roundProgress: "Round progress",
    progressCount: (current, total) => `${current} of ${total}`,

    timeLeft: "time left",
    secondsRemaining: (seconds) => `${seconds} seconds remaining`,

    transitionHeading: "Phase one complete.",
    transitionBody:
      "Now something bigger. One question about the world — and what you would change.",
    continueLabel: "Continue",

    sharedChallengePhaseLabel: "Phase 2 · Shared challenge",
    sharedChallengeGuidance:
      "Talk it through together. No order, no timer each — just the group.",
    challengeFallback: "One question about the world — and what you would change.",
    closingLineFallback:
      "Time! Before you split — swap contacts with anyone you want to see again.",
  },
  es: {
    loading: "Preparando tu conversación…",
    invalidLink: "Este enlace del evento no es válido.",
    notStarted: "Todo listo. Tu conversación se abrirá cuando el anfitrión la inicie.",
    tooLate: "El evento ya comenzó. ¡Únete más temprano la próxima vez!",
    syncError: "No pudimos sincronizar la conversación.",
    retry: "Intentar de nuevo",

    readyHeading: "Cuando estén listos.",
    readyBody:
      "Esperen a que todos estén en la mesa — un solo toque inicia el reloj para todo el grupo.",
    startLabel: "Comenzar",
    starting: "Comenzando…",

    fastQuestionsPhaseLabel: "Fase 1 · Preguntas rápidas",
    roundOf: (current, total) => `Ronda ${current} de ${total}`,
    turnLabel: (firstName, isCurrentUser) =>
      isCurrentUser ? "Tu turno" : `Turno de ${firstName}`,
    turnAnnouncement: (round, total, turn) => `Ronda ${round} de ${total}. ${turn}.`,
    fastQuestionsGuidance: (seconds) =>
      `Cada persona tiene ${seconds} segundos para responder. Sé honesto, sé breve, sé tú.`,
    participants: "Participantes",
    participantActivity: (firstName, active) =>
      `${firstName}, ${active ? "respondiendo ahora" : "esperando"}`,
    roundProgress: "Avance de rondas",
    progressCount: (current, total) => `${current} de ${total}`,

    timeLeft: "tiempo restante",
    secondsRemaining: (seconds) => `${seconds} segundos restantes`,

    transitionHeading: "Fase uno completada.",
    transitionBody: "Ahora algo más grande. Una pregunta sobre el mundo — y qué cambiarías.",
    continueLabel: "Continuar",

    sharedChallengePhaseLabel: "Fase 2 · Desafío compartido",
    sharedChallengeGuidance:
      "Convérsenlo entre todos. Sin orden, sin cronómetro individual — solo el grupo.",
    challengeFallback: "Una pregunta sobre el mundo — y qué cambiarías.",
    closingLineFallback:
      "¡Tiempo! Antes de separarse — intercambien contactos con quien quieran volver a ver.",
  },
} satisfies Record<ConversationLanguage, ConversationMessages>;

/**
 * The backend sends whatever the event was configured with, which may be a
 * regional tag like `es-MX`. Only the first two characters decide the language,
 * exactly as the backend's own `row.language[:2]` lookup does.
 */
export function conversationLanguage(raw: string): ConversationLanguage {
  return raw.slice(0, 2) === "es" ? "es" : "en";
}

export function messagesFor(language: ConversationLanguage): ConversationMessages {
  return conversationMessages[language];
}
