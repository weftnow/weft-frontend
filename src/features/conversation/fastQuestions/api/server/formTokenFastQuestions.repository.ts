import "server-only";
import { resolveAttendeeSession } from "@/features/groupReveal/api/server/attendeeSession.gateway";
import { AttendeeSessionGatewayError } from "@/features/groupReveal/api/server/attendeeSession.gateway";
import { createFastQuestionsGateway } from "./fastQuestions.gateway";
import { FastQuestionsGatewayError } from "./fastQuestions.gateway";
import type { AdvanceParticipantInput } from "../../types/fastQuestions.types";

export function createFormTokenFastQuestionsRepository(formToken: string, cookieHeader: string | null, fetchImpl?: typeof fetch) {
  let session: Promise<{ token: string; eventId: string }> | undefined;
  const resolve = () => (session ??= resolveAttendeeSession(formToken, cookieHeader, fetchImpl));
  const gateway = createFastQuestionsGateway(async () => (await resolve()).token, fetchImpl);
  return {
    async get() { const value = await resolve(); return gateway.get(value.eventId); },
    async start() { const value = await resolve(); return gateway.start(value.eventId); },
    async advance(body: AdvanceParticipantInput) { const value = await resolve(); return gateway.advance(value.eventId, body); },
    async continueToPhaseTwo() { const value = await resolve(); return gateway.continueToPhaseTwo(value.eventId); },
  };
}

export function formTokenConversationError(error: unknown): { code: string; status: number } {
  if (error instanceof AttendeeSessionGatewayError && error.code === "no_session") return { code: "no_session", status: 401 };
  if (error instanceof FastQuestionsGatewayError && error.code === "no_session") return { code: "no_session", status: 503 };
  return { code: "unavailable", status: 503 };
}
