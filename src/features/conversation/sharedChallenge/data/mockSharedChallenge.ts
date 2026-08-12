import type { ConversationLanguage } from "../../i18n/conversation.messages";

/**
 * Stand-ins for what the matching engine writes for a real group, and for the
 * closing line the backend sends when a session finishes. The mock source
 * exists so a whole session can be played locally without a backend.
 */

const CHALLENGE: Record<ConversationLanguage, string> = {
  en: "If this group could change one thing about how people find work, what would it be?",
  es: "Si este grupo pudiera cambiar una cosa sobre cómo la gente encuentra trabajo, ¿cuál sería?",
};

/** Verbatim the CLOSING_LINE table in the backend's app/api/v1/icebreaker.py. */
const CLOSING_LINE: Record<ConversationLanguage, string> = {
  en: "Time! Before you split — swap contacts with anyone you want to see again.",
  es: "¡Tiempo! Antes de separarse — intercambien contactos con quien quieran volver a ver.",
};

export function mockChallenge(language: ConversationLanguage): string {
  return CHALLENGE[language];
}

export function mockClosingLine(language: ConversationLanguage): string {
  return CLOSING_LINE[language];
}
