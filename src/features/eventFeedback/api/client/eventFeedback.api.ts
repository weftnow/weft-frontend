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
  | { status: "failed" };

export type EventFeedbackApi = {
  getStatus(eventId: string): Promise<EventFeedbackStatus | { unavailable: true }>;
  submit(eventId: string, answers: EventFeedbackSubmission): Promise<EventFeedbackOutcome>;
};

function path(eventId: string): string {
  return `/api/events/${eventId}/feedback`;
}

async function codeOf(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  const code = (body as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "unknown";
}

export const eventFeedbackApi: EventFeedbackApi = {
  async getStatus(eventId) {
    let response: Response;
    try {
      response = await fetch(path(eventId), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // A failed status read must not block the form: the worst case is a
      // guest who already submitted seeing the form once and getting the
      // thanks screen when they send it.
      return { unavailable: true };
    }

    if (!response.ok) return { unavailable: true };

    const parsed = eventFeedbackStatusSchema.safeParse(await response.json().catch(() => null));
    // A failed read costs the meet-again question its list of names, but the
    // rest of the form still works — better than a blocked screen.
    return parsed.success ? parsed.data : { unavailable: true };
  },

  async submit(eventId, answers) {
    let response: Response;
    try {
      response = await fetch(path(eventId), {
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
    return { status: "failed" };
  },
};
