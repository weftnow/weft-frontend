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
    eventOverTitle: "This event has ended.",
    eventOverBody: "Your group is no longer available. Thanks for joining us \u2014 we hope you met someone good.",
    matchFound: "Match found",
    allSet: "You're all set!",
    lede: "Weft has matched you with a great group. Get ready for meaningful conversations.",
    group: "Group",
    people: "{count} people",
    roleAt: "{role} at {company}",
    colourGroup: "{colour} group",
    colours: {
      amber: "Amber",
      teal: "Teal",
      coral: "Coral",
      indigo: "Indigo",
      lime: "Lime",
      magenta: "Magenta",
      cyan: "Cyan",
      rust: "Rust",
      violet: "Violet",
      olive: "Olive",
      rose: "Rose",
      slate: "Slate",
    },
    startTitle: "Start the experience",
    startBody: "You'll be guided through a series of conversations and activities together.",
    startConversation: "Start guided conversations",
    starting: "Starting…",
    footnote: "Sit with your group to begin.",
    confirmationError: "We couldn't confirm your group. Tap again to continue anyway.",
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
    eventOverTitle: "Este evento ya termin\u00f3.",
    eventOverBody: "Tu grupo ya no est\u00e1 disponible. Gracias por acompa\u00f1arnos: esperamos que hayas conocido a alguien especial.",
    matchFound: "Grupo encontrado",
    allSet: "¡Todo listo!",
    lede: "Weft te ha emparejado con un gran grupo. Prepárate para conversaciones con sentido.",
    group: "Grupo",
    people: "{count} personas",
    roleAt: "{role} en {company}",
    colourGroup: "Grupo {colour}",
    colours: {
      amber: "Ámbar",
      teal: "Verde azulado",
      coral: "Coral",
      indigo: "Índigo",
      lime: "Lima",
      magenta: "Magenta",
      cyan: "Cian",
      rust: "Óxido",
      violet: "Violeta",
      olive: "Oliva",
      rose: "Rosa",
      slate: "Pizarra",
    },
    startTitle: "Comienza la experiencia",
    startBody: "Te guiaremos por una serie de conversaciones y actividades, todos juntos.",
    startConversation: "Iniciar conversaciones guiadas",
    starting: "Iniciando…",
    footnote: "Siéntate con tu grupo para empezar.",
    confirmationError: "No pudimos confirmar tu grupo. Toca de nuevo para continuar.",
  },
} as const;

export type GroupRevealMessages =
  (typeof groupRevealMessages)[GroupRevealLanguage];

export function groupRevealLanguageFor(value: string | undefined): GroupRevealLanguage {
  return value?.toLowerCase().startsWith("es") ? "es" : "en";
}

/**
 * The group's colour, in the reader's language.
 *
 * Falls back to the raw slug rather than to a placeholder: a colour we have
 * not translated yet still tells someone which table is theirs, and the slugs
 * are English words a Spanish reader can match against the dot beside them.
 */
export function colourLabelFor(
  slug: string,
  messages: GroupRevealMessages,
): string {
  const colours: Record<string, string> = messages.colours;
  return messages.colourGroup.replace(
    "{colour}",
    colours[slug.toLowerCase()] ?? slug,
  );
}
