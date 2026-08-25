import { z } from "zod";
import { mapQuestionnaireDefinition } from "../../model/questionnaire.mapper";
import {
  formDefinitionSchema,
  type FormSubmissionDto,
  type Language,
} from "../../schemas/questionnaire.contract.schema";
import type { Questionnaire } from "../../types/questionnaire.types";

const REQUEST_TIMEOUT_MS = 8_000;

export type QuestionnaireFailure =
  | { status: "invalidLink" }
  | { status: "notFound" }
  | { status: "notAccepting" }
  | { status: "versionConflict" }
  | { status: "idempotencyConflict" }
  | { status: "validation"; field?: string }
  | { status: "unavailable" };

export type LoadQuestionnaireOutcome =
  | { status: "ok"; questionnaire: Questionnaire }
  | QuestionnaireFailure;

export type SubmitQuestionnaireOutcome =
  | { status: "ok"; setCookie: string }
  | QuestionnaireFailure;

const submitResponseSchema = z.object({ attendee_token: z.string().min(1) });

const errorBodySchema = z.object({
  code: z.string().optional(),
  detail: z.unknown().optional(),
});

const CODE_TO_STATUS: Record<string, QuestionnaireFailure["status"]> = {
  form_not_accepting: "notAccepting",
  form_version_conflict: "versionConflict",
  idempotency_conflict: "idempotencyConflict",
};

function baseUrl(): string {
  const url = process.env.WEFT_B2B_API_URL;
  if (!url) throw new Error("WEFT_B2B_API_URL is not configured");
  return url;
}

function extractValidationField(detail: unknown): string | undefined {
  if (!Array.isArray(detail)) return undefined;
  for (const issue of detail) {
    const loc = (issue as { loc?: unknown } | null)?.loc;
    if (Array.isArray(loc) && loc[0] === "body" && typeof loc[1] === "string") {
      return loc[1];
    }
  }
  return undefined;
}

async function readErrorBody(response: Response) {
  try {
    return errorBodySchema.parse(await response.json());
  } catch {
    return {};
  }
}

async function mapFailure(
  response: Response,
  operation: "load" | "submit",
): Promise<QuestionnaireFailure> {
  // The event is over: the link was real and its room has closed. Checked
  // before the log line because this is a link reaching the end of its life,
  // not a failure -- every rescanned QR code from a past event would otherwise
  // report itself as a gateway error. Reuses the closed-sign-ups copy rather
  // than earning its own, because that is exactly what the guest holding a
  // spent code needs to be told.
  if (response.status === 410) return { status: "notAccepting" };

  // Deliberately generic: never log the URL, token, body, or upstream detail.
  console.error(`questionnaire gateway ${operation} failed`, response.status);

  if (response.status === 401) return { status: "invalidLink" };
  if (response.status === 404) return { status: "notFound" };

  if (response.status === 422) {
    const body = await readErrorBody(response);
    return { status: "validation", field: extractValidationField(body.detail) };
  }

  if (response.status === 409) {
    const body = await readErrorBody(response);
    const mapped = body.code ? CODE_TO_STATUS[body.code] : undefined;
    return mapped ? { status: mapped } : { status: "unavailable" };
  }

  return { status: "unavailable" };
}

export async function loadQuestionnaire(
  formToken: string,
  language?: Language,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadQuestionnaireOutcome> {
  const url = new URL(`${baseUrl()}/f/${encodeURIComponent(formToken)}/questions`);
  if (language) url.searchParams.set("lang", language);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    console.error("questionnaire gateway load failed", "network-error");
    return { status: "unavailable" };
  }

  if (!response.ok) return mapFailure(response, "load");

  try {
    const dto = formDefinitionSchema.parse(await response.json());
    return { status: "ok", questionnaire: mapQuestionnaireDefinition(dto) };
  } catch {
    console.error("questionnaire gateway load failed", "invalid-body");
    return { status: "unavailable" };
  }
}

export async function submitQuestionnaire(
  formToken: string,
  submissionId: string,
  body: FormSubmissionDto,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitQuestionnaireOutcome> {
  const url = new URL(`${baseUrl()}/f/${encodeURIComponent(formToken)}/submit`);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": submissionId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    console.error("questionnaire gateway submit failed", "network-error");
    return { status: "unavailable" };
  }

  if (!response.ok) return mapFailure(response, "submit");

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    console.error("questionnaire gateway submit failed", "missing-cookie");
    return { status: "unavailable" };
  }

  try {
    submitResponseSchema.parse(await response.json());
  } catch {
    console.error("questionnaire gateway submit failed", "invalid-body");
    return { status: "unavailable" };
  }

  // The parsed attendee_token is intentionally discarded here: it must never
  // leave this module as a JS-readable value, only as the HttpOnly cookie.
  return { status: "ok", setCookie };
}
