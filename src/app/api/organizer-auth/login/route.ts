import { NextResponse } from "next/server";
import { loginOrganizer } from "@/features/organizer-auth/api/server/organizerAuth.gateway";
import { setOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { loginRequestSchema } from "@/features/organizer-auth/schemas/organizerAuth.schema";
import {
  invalidOrganizerAuthRequest,
  organizerAuthFailureResponse,
} from "../_lib/response";

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return invalidOrganizerAuthRequest();
  }
  const parsed = loginRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidOrganizerAuthRequest();

  const outcome = await loginOrganizer(parsed.data);
  if (outcome.status !== "ok") return organizerAuthFailureResponse(outcome);

  const response = NextResponse.json(
    { status: "authenticated" },
    { headers: { "Cache-Control": "no-store" } },
  );
  setOrganizerSession(response, outcome.accessToken);
  return response;
}
