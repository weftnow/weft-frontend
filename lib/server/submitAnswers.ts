import { weftFetch, type WeftErrorCode } from "@/lib/server/weftApi";
import type { AnswersRequest, AnswersResponse } from "@/lib/weftTypes";

/** What the browser is allowed to see: never the session id. */
export type ClientAnswers = {
  role: "originator" | "responder";
  share_token: string;
  /** The sender's way back, independent of the session cookie. */
  return_token: string;
  pair_id?: string;
};

export type SubmitOutcome =
  | { ok: true; sessionId: string; body: ClientAnswers }
  | { ok: false; status: number; body: { error: string; code: WeftErrorCode } };

const MALFORMED = "That submission was incomplete. Please try again.";
const UNTRUSTED = "The service is unavailable right now. Please try again.";

function isAnswerValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isInteger(value);
  return Array.isArray(value) && value.every((v) => typeof v === "number" && Number.isInteger(v));
}

/**
 * Route Handlers are public endpoints, so the body is whatever someone sent.
 * This is a shape guard, not a validator -- the backend owns the real rules and
 * its 400s are worded for the person reading them.
 */
export function parseAnswersBody(raw: unknown): AnswersRequest | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { name, email, phone, answers, invite_token: token } = raw as Record<string, unknown>;
  if (typeof name !== "string" || typeof email !== "string" || typeof phone !== "string") {
    return null;
  }
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return null;
  const entries = Object.values(answers as Record<string, unknown>);
  if (entries.length === 0 || !entries.every(isAnswerValue)) return null;
  if (token !== undefined && typeof token !== "string") return null;

  return {
    name,
    email,
    phone,
    answers: answers as AnswersRequest["answers"],
    ...(token === undefined ? {} : { invite_token: token }),
  };
}

function isAnswersResponse(value: unknown): value is AnswersResponse {
  if (typeof value !== "object" || value === null) return false;
  const { role, session_id: sid, share_token: tok, return_token: ret, pair_id: pid } =
    value as Record<string, unknown>;
  if (typeof sid !== "string" || typeof tok !== "string") return false;
  if (typeof ret !== "string") return false;
  if (role === "originator") return true;
  return role === "responder" && typeof pid === "string";
}

/** Upstream meaning -> the status this proxy answers with. */
function httpStatusFor(code: WeftErrorCode): number {
  if (code === "validation") return 400;
  if (code === "not_found") return 404;
  if (code === "expired") return 410;
  // A rejected proxy key means we are misconfigured; the visitor did nothing wrong.
  if (code === "unauthorized") return 502;
  return 503;
}

export async function submitAnswers(
  raw: unknown,
  fetchImpl?: typeof fetch,
): Promise<SubmitOutcome> {
  const body = parseAnswersBody(raw);
  if (!body) {
    return { ok: false, status: 400, body: { error: MALFORMED, code: "validation" } };
  }

  const result = await weftFetch<unknown>(
    "/api/answers",
    { method: "POST", body: JSON.stringify(body) },
    fetchImpl,
  );

  if (!result.ok) {
    return {
      ok: false,
      status: httpStatusFor(result.code),
      body: { error: result.message, code: result.code },
    };
  }

  if (!isAnswersResponse(result.data)) {
    console.error("weft_core answered /api/answers with an unexpected shape");
    return { ok: false, status: 503, body: { error: UNTRUSTED, code: "unavailable" } };
  }

  const data = result.data;
  return {
    ok: true,
    sessionId: data.session_id,
    body: {
      role: data.role,
      share_token: data.share_token,
      return_token: data.return_token,
      ...(data.role === "responder" ? { pair_id: data.pair_id } : {}),
    },
  };
}
