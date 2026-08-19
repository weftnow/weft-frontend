import { NextResponse } from "next/server";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";

/**
 * "Reveal the tables" — the host's moment, and the dashboard's second write.
 *
 * The backend answers 202 and arms a five-second countdown rather than
 * flipping every phone at once (app/services/events.py), so success here means
 * the room is about to see their tables, not that it already has. It is
 * idempotent on repeat presses and has no inverse, which is why the card in
 * front of it asks twice.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const token = await readOrganizerSession();
  if (!token) return NextResponse.json({ code: "unauthorized" }, { status: 401 });

  const outcome = await fetchFromBackend<unknown>(
    `/v1/events/${eventId}/reveal`,
    token,
    { method: "POST" },
  );
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
  return NextResponse.json(outcome.data, { status: 202 });
}
