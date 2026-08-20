import { NextResponse } from "next/server";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";

/**
 * The profile and defaults save.
 *
 * Same shape as the event routes beside it: the organizer's token lives in an
 * httpOnly cookie the browser cannot read, so the request comes here first and
 * picks up its Authorization header on the way past. The body is forwarded
 * rather than re-validated — settingsUpdateSchema has already applied the
 * backend's rules in the browser, and the backend enforces them for real.
 */
export async function PATCH(request: Request) {
  const token = await readOrganizerSession();
  if (!token) return NextResponse.json({ code: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "unavailable" }, { status: 400 });
  }

  const outcome = await fetchFromBackend<unknown>("/v1/auth/me", token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (outcome.status === "ok") return NextResponse.json(outcome.data);
  if (outcome.status === "badRequest") {
    return NextResponse.json({ code: outcome.code }, { status: 400 });
  }
  return NextResponse.json(
    { code: outcome.status },
    { status: outcome.status === "unauthorized" ? 401 : 503 },
  );
}
