import "server-only";
import { cookies } from "next/headers";
import { attendeeCookieName, createEventFeedbackGateway } from "./eventFeedback.gateway";

/**
 * The backend-backed store. Reads the attendee token from the per-event
 * HttpOnly cookie the questionnaire submission set, so the token never reaches
 * the browser bundle — only this server module ever sees it.
 */
export const backendEventFeedbackRepository = createEventFeedbackGateway(async (eventId) => {
  const jar = await cookies();
  return jar.get(attendeeCookieName(eventId))?.value;
});
