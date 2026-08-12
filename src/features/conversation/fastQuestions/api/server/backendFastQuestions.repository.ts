import "server-only";
import { cookies } from "next/headers";
import { attendeeCookieName, createFastQuestionsGateway } from "./fastQuestions.gateway";

/**
 * The backend-backed store. Reads the attendee token from the per-event
 * HttpOnly cookie the questionnaire submission set, so the token never
 * reaches the browser bundle — only this server module ever sees it.
 */
export const backendFastQuestionsRepository = createFastQuestionsGateway(async (eventId) => {
  const jar = await cookies();
  return jar.get(attendeeCookieName(eventId))?.value;
});
