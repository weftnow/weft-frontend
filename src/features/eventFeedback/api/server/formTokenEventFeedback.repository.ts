import "server-only";
import {
  conversationSource,
  type ConversationEnvironment,
} from "@/features/conversation/fastQuestions/api/server/fastQuestions.source";
import {
  AttendeeSessionGatewayError,
  resolveAttendeeSession,
} from "@/features/groupReveal/api/server/attendeeSession.gateway";
import type { EventFeedbackSubmission } from "../../schemas/eventFeedback.schema";
import {
  createEventFeedbackGateway,
  EventFeedbackGatewayError,
  type EventFeedbackStore,
} from "./eventFeedback.gateway";

/**
 * The feedback store for a guest arriving on a form-token link.
 *
 * This replaces reading the `weft_attendee_*` cookie and spending its value as
 * the attendee token. That cookie holds a long-lived *session handle*, signed
 * with a different salt than the token `/a/...` accepts, so the backend
 * rejected every feedback read and write as a forgery — which is why no
 * submission ever reached `event_feedback`. `/f/{formToken}/resume` is the only
 * thing that mints a spendable token, exactly as the conversation and the group
 * reveal already do.
 *
 * The session is resolved once per request and shared by both calls: a single
 * submission makes several backend requests, and re-minting a token for each
 * would spend a round trip to say something we already know.
 */
export async function createFormTokenEventFeedbackRepository(
  formToken: string,
  cookieHeader: string | null,
  fetchImpl?: typeof fetch,
  environment: ConversationEnvironment = process.env,
): Promise<EventFeedbackStore> {
  // Feedback follows the conversation's source, as it always has: a room
  // running against the real backend must not have its feedback quietly land
  // in an in-memory mock, and an unconfigured production still fails loudly
  // here rather than at the first guest's submission.
  if (conversationSource(environment) === "mock") {
    const { mockEventFeedbackRepository } = await import("./mockEventFeedback.repository");
    return mockEventFeedbackRepository;
  }

  let session: Promise<{ token: string; eventId: string }> | undefined;

  /**
   * Session failures are translated into this feature's own error type so the
   * route keeps one mapping to read. A device with no usable session is the
   * same thing to a guest as having no link at all — both mean nobody can tell
   * whose feedback this is — so it lands on the screen that says so rather
   * than on a retry button that can never succeed.
   */
  async function resolve(): Promise<{ token: string; eventId: string }> {
    try {
      return await (session ??= resolveAttendeeSession(formToken, cookieHeader, fetchImpl));
    } catch (error) {
      if (error instanceof AttendeeSessionGatewayError && error.code === "no_session") {
        throw new EventFeedbackGatewayError(
          "no_attendee_token",
          "No saved session on this device",
        );
      }
      throw new EventFeedbackGatewayError("unavailable", "Attendee session could not be resolved");
    }
  }

  const gateway = createEventFeedbackGateway(async () => (await resolve()).token, fetchImpl);

  return {
    async status() {
      // The event id comes back from /resume rather than from the URL: the
      // form token names the session, and only the backend can say which
      // event it belongs to.
      return gateway.status((await resolve()).eventId);
    },
    async submit(_sessionKey: string, answers: EventFeedbackSubmission) {
      return gateway.submit((await resolve()).eventId, answers);
    },
  };
}
