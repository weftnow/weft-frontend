import { mapIcebreakerState } from "../../model/fastQuestions.mapper";
import { icebreakerStateDtoSchema } from "../../schemas/icebreaker.contract.schema";
import type { AdvanceParticipantInput, FastQuestionsSession } from "../../types/fastQuestions.types";

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Talks to weft-b2b-backend's icebreaker endpoints.
 *
 * The backend keys a session by attendee token, not by event: a session
 * belongs to a *group*, and the token is what says which person — hence which
 * group. The token arrives as an HttpOnly cookie named per event, so the
 * event id in the URL is what selects the right cookie.
 */

export class FastQuestionsGatewayError extends Error {
  readonly code: "no_attendee_token" | "no_session" | "unavailable";

  constructor(code: FastQuestionsGatewayError["code"], message: string) {
    super(message);
    this.name = "FastQuestionsGatewayError";
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
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const url = `${baseUrl()}/a/${encodeURIComponent(token)}/icebreaker${path}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Deliberately generic: never log the URL or the token.
    console.error("fast questions gateway failed", "network-error");
    throw new FastQuestionsGatewayError("unavailable", "Icebreaker backend unreachable");
  }

  // 204 on GET means the group has no session — the backend's "nothing to
  // show yet" contract, not an error condition on the wire.
  if (response.status === 204 || response.status === 404) {
    throw new FastQuestionsGatewayError("no_session", "No icebreaker session for this group");
  }

  if (!response.ok) {
    console.error("fast questions gateway failed", response.status);
    throw new FastQuestionsGatewayError("unavailable", "Icebreaker backend rejected the request");
  }

  return response.json();
}

async function readSession(
  eventId: string,
  token: string,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<FastQuestionsSession> {
  const body = await call(token, path, init, fetchImpl);
  const parsed = icebreakerStateDtoSchema.safeParse(body);
  if (!parsed.success) {
    console.error("fast questions gateway failed", "invalid-body");
    throw new FastQuestionsGatewayError("unavailable", "Icebreaker backend returned an unknown shape");
  }
  return mapIcebreakerState(eventId, parsed.data);
}

export function createFastQuestionsGateway(
  readToken: (eventId: string) => Promise<string | undefined>,
  fetchImpl: typeof fetch = fetch,
) {
  async function token(eventId: string): Promise<string> {
    const value = await readToken(eventId);
    if (!value) {
      throw new FastQuestionsGatewayError(
        "no_attendee_token",
        "No attendee token for this event",
      );
    }
    return value;
  }

  return {
    async get(eventId: string): Promise<FastQuestionsSession> {
      return readSession(eventId, await token(eventId), "", { method: "GET" }, fetchImpl);
    },

    async start(eventId: string): Promise<FastQuestionsSession> {
      return readSession(eventId, await token(eventId), "/start", { method: "POST" }, fetchImpl);
    },

    async advance(
      eventId: string,
      expected: AdvanceParticipantInput,
    ): Promise<FastQuestionsSession> {
      // The backend counts rounds from 1 and uses the pair as its stale-tap
      // guard: a duplicate naming a turn already gone is a no-op rather than
      // a skipped participant. Send back exactly what the client rendered.
      return readSession(
        eventId,
        await token(eventId),
        "/done",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            round: expected.roundIndex + 1,
            turn_index: expected.participantIndex,
          }),
        },
        fetchImpl,
      );
    },
  };
}
