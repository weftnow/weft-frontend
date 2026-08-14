import {
  eventFeedbackStatusSchema,
  type EventFeedbackStatus,
  type EventFeedbackSubmission,
} from "../../schemas/eventFeedback.schema";

const TIMEOUT_MS = 8_000;

export type EventFeedbackOutcome =
  | { status: "recorded" }
  | { status: "already_submitted" }
  | { status: "no_attendee_token" }
  | { status: "not_configured" }
  | { status: "failed" };

/**
 * `not_configured` is deliberately not folded into `failed`. A retry fixes a
 * dropped request; it can never fix a server that has no data source, and
 * offering the button anyway asks a guest to keep pressing at something only a
 * deploy can repair.
 */
export type EventFeedbackStatusResult =
  | EventFeedbackStatus
  | { unavailable: true }
  | { notConfigured: true };

export type EventFeedbackApi = {
  getStatus(sessionKey: string): Promise<EventFeedbackStatusResult>;
  submit(sessionKey: string, answers: EventFeedbackSubmission): Promise<EventFeedbackOutcome>;
};

/**
 * The session key is the form token, not the event id: it is the only thing the
 * server can trade for an attendee token at `/resume`. An event id names the
 * evening but nobody in it, so a route keyed by one could never say whose
 * feedback had just arrived — and the one that was could not save it.
 */
function path(sessionKey: string): string {
  return `/api/questionnaire/${encodeURIComponent(sessionKey)}/feedback`;
}

async function codeOf(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  const code = (body as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "unknown";
}

export const eventFeedbackApi: EventFeedbackApi = {
  async getStatus(sessionKey) {
    let response: Response;
    try {
      response = await fetch(path(sessionKey), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // A failed status read must not block the form: the worst case is a
      // guest who already submitted seeing the form once and getting the
      // thanks screen when they send it.
      return { unavailable: true };
    }

    // Caught here rather than at submit time: without this the form renders,
    // quietly loses its meet-again names, and only refuses once the guest has
    // written the whole thing out.
    if (response.status === 503 && (await codeOf(response)) === "conversation_not_configured") {
      return { notConfigured: true };
    }
    if (!response.ok) return { unavailable: true };

    const parsed = eventFeedbackStatusSchema.safeParse(await response.json().catch(() => null));
    // A failed read costs the meet-again question its list of names, but the
    // rest of the form still works — better than a blocked screen.
    return parsed.success ? parsed.data : { unavailable: true };
  },

  async submit(sessionKey, answers) {
    let response: Response;
    try {
      response = await fetch(path(sessionKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return { status: "failed" };
    }

    if (response.ok) return { status: "recorded" };
    // They did submit — the constraint fired because a first submission
    // already landed. Showing an error for that would be a lie.
    if (response.status === 409) return { status: "already_submitted" };
    if (response.status === 401) {
      const code = await codeOf(response);
      return code === "no_attendee_token"
        ? { status: "no_attendee_token" }
        : { status: "failed" };
    }
    if (response.status === 503 && (await codeOf(response)) === "conversation_not_configured") {
      return { status: "not_configured" };
    }
    return { status: "failed" };
  },
};
