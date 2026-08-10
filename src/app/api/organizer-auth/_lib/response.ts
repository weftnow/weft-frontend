import type { OrganizerAuthGatewayFailure } from "@/features/organizer-auth/api/server/organizerAuth.gateway";

const STATUS_BY_FAILURE: Record<OrganizerAuthGatewayFailure["status"], number> = {
  validation: 400,
  emailAlreadyRegistered: 409,
  invalidCredentials: 401,
  unavailable: 503,
};

export function organizerAuthFailureResponse(
  outcome: OrganizerAuthGatewayFailure,
): Response {
  const body: { code: OrganizerAuthGatewayFailure["status"]; field?: string } = {
    code: outcome.status,
  };
  if (outcome.status === "validation" && outcome.field) body.field = outcome.field;
  return Response.json(body, {
    status: STATUS_BY_FAILURE[outcome.status],
    headers: { "Cache-Control": "no-store" },
  });
}

export function invalidOrganizerAuthRequest(): Response {
  return Response.json(
    { code: "validation" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
