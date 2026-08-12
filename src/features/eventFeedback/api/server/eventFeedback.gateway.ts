import {
  eventFeedbackStatusDtoSchema,
  type EventFeedbackStatus,
  type EventFeedbackSubmission,
} from "../../schemas/eventFeedback.schema";

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Talks to weft-b2b-backend's event-feedback endpoints.
 *
 * Same shape as the icebreaker gateway: the backend keys everything by
 * attendee token, the token arrives as an HttpOnly cookie named per event, and
 * only this server module ever sees it.
 */

export type EventFeedbackErrorCode =
  | "no_attendee_token"
  | "already_submitted"
  | "invalid"
  | "unavailable";

export class EventFeedbackGatewayError extends Error {
  readonly code: EventFeedbackErrorCode;

  constructor(code: EventFeedbackErrorCode, message: string) {
    super(message);
    this.name = "EventFeedbackGatewayError";
    this.code = code;
  }
}

/** Mirrors `_cookie_name` in the backend's app/api/v1/forms.py. */
export function attendeeCookieName(eventId: string): string {
  return `weft_attendee_${eventId.replace(/-/g, "")}`;
}

function baseUrl(): string {
  const url = process.env.WEFT_B2B_API_URL;
  if (!url) throw new Error("WEFT_B2B_API_URL is not configured");
  return url;
}

async function call(
  token: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const url = `${baseUrl()}/a/${encodeURIComponent(token)}/event-feedback`;

  try {
    return await fetchImpl(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Deliberately generic: never log the URL or the token.
    console.error("event feedback gateway failed", "network-error");
    throw new EventFeedbackGatewayError("unavailable", "Feedback backend unreachable");
  }
}

export function createEventFeedbackGateway(
  readToken: (eventId: string) => Promise<string | undefined>,
  fetchImpl: typeof fetch = fetch,
) {
  async function token(eventId: string): Promise<string> {
    const value = await readToken(eventId);
    if (!value) {
      throw new EventFeedbackGatewayError(
        "no_attendee_token",
        "No attendee token for this event",
      );
    }
    return value;
  }

  return {
    async status(eventId: string): Promise<EventFeedbackStatus> {
      const response = await call(await token(eventId), { method: "GET" }, fetchImpl);

      // A signed token whose attendee no longer exists reads the same as never
      // having had one: there is nothing this person can submit either way.
      if (response.status === 401 || response.status === 404) {
        throw new EventFeedbackGatewayError("no_attendee_token", "Token not usable");
      }
      if (!response.ok) {
        console.error("event feedback gateway failed", response.status);
        throw new EventFeedbackGatewayError("unavailable", "Feedback backend rejected the read");
      }

      const parsed = eventFeedbackStatusDtoSchema.safeParse(await response.json());
      if (!parsed.success) {
        console.error("event feedback gateway failed", "invalid-body");
        throw new EventFeedbackGatewayError("unavailable", "Feedback backend returned an unknown shape");
      }
      return parsed.data;
    },

    async submit(eventId: string, answers: EventFeedbackSubmission): Promise<void> {
      const response = await call(
        await token(eventId),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recommend_score: answers.recommendScore,
            rating: answers.rating,
            improvement: answers.improvement,
          }),
        },
        fetchImpl,
      );

      if (response.ok) return;

      if (response.status === 401 || response.status === 404) {
        throw new EventFeedbackGatewayError("no_attendee_token", "Token not usable");
      }
      // The backend's one-submission-per-guest constraint. Not a failure from
      // the guest's point of view — they did submit — so the screen shows
      // thanks rather than an error.
      if (response.status === 409) {
        throw new EventFeedbackGatewayError("already_submitted", "Feedback already recorded");
      }
      if (response.status === 422 || response.status === 400) {
        throw new EventFeedbackGatewayError("invalid", "Feedback rejected as invalid");
      }

      console.error("event feedback gateway failed", response.status);
      throw new EventFeedbackGatewayError("unavailable", "Feedback backend rejected the write");
    },
  };
}

export type EventFeedbackStore = ReturnType<typeof createEventFeedbackGateway>;
