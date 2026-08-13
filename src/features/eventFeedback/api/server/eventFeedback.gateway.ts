import {
  eventFeedbackStatusDtoSchema,
  myTableDtoSchema,
  type EventFeedbackStatus,
  type EventFeedbackSubmission,
} from "../../schemas/eventFeedback.schema";

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Talks to weft-b2b-backend's event-feedback and per-person feedback endpoints.
 *
 * Same shape as the icebreaker gateway: the backend keys everything by attendee
 * token, the token arrives as an HttpOnly cookie named per event, and only this
 * server module ever sees it.
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

/**
 * A missing base URL is a configuration failure, not a bug, so it leaves here
 * as a typed gateway error — matching the fast questions gateway, so the same
 * misconfiguration cannot answer differently in the two features.
 */
function baseUrl(): string {
  const url = process.env.WEFT_B2B_API_URL;
  if (!url) {
    console.error("event feedback gateway failed", "missing-base-url");
    throw new EventFeedbackGatewayError("unavailable", "WEFT_B2B_API_URL is not configured");
  }
  return url;
}

async function call(path: string, init: RequestInit, fetchImpl: typeof fetch): Promise<Response> {
  // Resolved outside the try: inside it, a configuration failure would be
  // caught and logged as a network error, which is a lie to whoever is reading
  // the logs at the time.
  const url = `${baseUrl()}${path}`;
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

function unusableToken(status: number): boolean {
  return status === 401 || status === 404;
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

  /**
   * Who else was at this guest's table. A 204 means the group was never
   * published, which is not an error here — the rest of the form still works,
   * so an empty list simply hides the question rather than blocking the screen.
   */
  async function tablemates(signed: string): Promise<{ displayName: string; ref: string }[]> {
    const response = await call(`/a/${encodeURIComponent(signed)}`, { method: "GET" }, fetchImpl);
    if (response.status === 204) return [];
    if (unusableToken(response.status)) {
      throw new EventFeedbackGatewayError("no_attendee_token", "Token not usable");
    }
    if (!response.ok) {
      console.error("event feedback gateway failed", response.status);
      return [];
    }
    const parsed = myTableDtoSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      console.error("event feedback gateway failed", "invalid-table-body");
      return [];
    }
    return parsed.data.tablemates.map((mate) => ({
      displayName: mate.display_name,
      ref: mate.ref,
    }));
  }

  return {
    async status(eventId: string): Promise<EventFeedbackStatus> {
      const signed = await token(eventId);
      const response = await call(
        `/a/${encodeURIComponent(signed)}/event-feedback`,
        { method: "GET" },
        fetchImpl,
      );

      // A signed token whose attendee no longer exists reads the same as never
      // having had one: there is nothing this person can submit either way.
      if (unusableToken(response.status)) {
        throw new EventFeedbackGatewayError("no_attendee_token", "Token not usable");
      }
      if (!response.ok) {
        console.error("event feedback gateway failed", response.status);
        throw new EventFeedbackGatewayError("unavailable", "Feedback backend rejected the read");
      }

      const parsed = eventFeedbackStatusDtoSchema.safeParse(await response.json());
      if (!parsed.success) {
        console.error("event feedback gateway failed", "invalid-body");
        throw new EventFeedbackGatewayError(
          "unavailable",
          "Feedback backend returned an unknown shape",
        );
      }

      // Someone who already submitted is on their way to the thanks screen and
      // will never see the list, so do not spend a request building it.
      if (parsed.data.submitted) return { submitted: true, tablemates: [] };
      return { submitted: false, tablemates: await tablemates(signed) };
    },

    async submit(eventId: string, answers: EventFeedbackSubmission): Promise<void> {
      const signed = await token(eventId);

      // Meet-again first, event feedback last. Both are refused on a repeat, so
      // ordering the one-shot write last means a retry after a partial failure
      // re-sends the rest harmlessly and still lands the submission. The other
      // order would mark the guest done with their meet-again answers lost.
      for (const ref of answers.meetAgainRefs) {
        const response = await call(
          `/a/${encodeURIComponent(signed)}/feedback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to_ref: ref, would_meet_again: true }),
          },
          fetchImpl,
        );
        // 409 is "already recorded", which is the desired end state. A 404 here
        // means that ref is not at this table — stale UI, not worth failing
        // the whole submission over.
        if (!response.ok && response.status !== 409 && response.status !== 404) {
          console.error("event feedback gateway failed", response.status);
          throw new EventFeedbackGatewayError("unavailable", "Meet-again write rejected");
        }
      }

      const response = await call(
        `/a/${encodeURIComponent(signed)}/event-feedback`,
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
      if (unusableToken(response.status)) {
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
