import { NextResponse } from "next/server";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";

/**
 * The password change.
 *
 * The 400 is forwarded with its code intact rather than flattened into a 503:
 * `invalid_password` is the one rejection on this screen that the organizer
 * caused and can fix, and it must not read as an outage. It must also not
 * become a 401 — that is what the whole 400 path exists to avoid, since the
 * client turns a 401 into a bounce to the login screen.
 */
export async function POST(request: Request) {
  const token = await readOrganizerSession();
  if (!token) return NextResponse.json({ code: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "unavailable" }, { status: 400 });
  }

  const outcome = await fetchFromBackend<unknown>("/v1/auth/password", token, {
    method: "POST",
    body: JSON.stringify(body),
  });

  // The 204 the password endpoint returns is already handled by the
  // gateway's Task 5 change, so `ok` with `data: null` is the success case.
  if (outcome.status === "ok") return NextResponse.json(null);
  if (outcome.status === "badRequest") {
    return NextResponse.json({ code: outcome.code }, { status: 400 });
  }
  return NextResponse.json(
    { code: outcome.status },
    { status: outcome.status === "unauthorized" ? 401 : 503 },
  );
}
