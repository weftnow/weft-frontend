import { NextResponse } from "next/server";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";

/**
 * Creating an event — the only write that brings something into existence.
 *
 * Same shape as the lock route beside it: the organizer's token lives in an
 * httpOnly cookie the browser cannot read, so the request comes here first and
 * picks up its Authorization header on the way past.
 *
 * The body is forwarded rather than re-validated. eventCreateSchema has already
 * applied the backend's own rules in the browser, and a second copy of them
 * here would be a third place to keep in sync for no extra safety — the backend
 * is the one that actually enforces them.
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

  const outcome = await fetchFromBackend<unknown>("/v1/events", token, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (outcome.status !== "ok") {
    const status =
      outcome.status === "unauthorized"
        ? 401
        : outcome.status === "planRequired"
          ? 402
          : outcome.status === "notFound"
            ? 404
            : 503;
    return NextResponse.json({ code: outcome.status }, { status });
  }
  return NextResponse.json(outcome.data, { status: 201 });
}
