import type { QuestionnaireFailure } from "@/features/questionnaire/api/server/questionnaire.gateway";

const STATUS_BY_FAILURE: Record<QuestionnaireFailure["status"], number> = {
  invalidLink: 401,
  notFound: 404,
  notAccepting: 409,
  versionConflict: 409,
  idempotencyConflict: 409,
  validation: 400,
  unavailable: 503,
};

export function questionnaireFailureResponse(outcome: QuestionnaireFailure): Response {
  const body: { code: QuestionnaireFailure["status"]; field?: string } = {
    code: outcome.status,
  };
  if (outcome.status === "validation" && outcome.field) {
    body.field = outcome.field;
  }
  return Response.json(body, {
    status: STATUS_BY_FAILURE[outcome.status],
    headers: { "Cache-Control": "no-store" },
  });
}
