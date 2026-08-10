import {
  validateOrganizerSession,
  type OrganizerSessionOutcome,
} from "../api/server/organizerAuth.gateway";

export type OrganizerPageDecision =
  | { status: "authenticated" }
  | { status: "redirect" }
  | { status: "unavailable" };

export async function resolveOrganizerPage(
  sessionToken: string | null,
  validate: (token: string) => Promise<OrganizerSessionOutcome> = validateOrganizerSession,
): Promise<OrganizerPageDecision> {
  if (!sessionToken) return { status: "redirect" };
  const outcome = await validate(sessionToken);
  if (outcome.status === "valid") return { status: "authenticated" };
  if (outcome.status === "invalid") return { status: "redirect" };
  return { status: "unavailable" };
}
