import { NextResponse } from "next/server";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";

/**
 * "Form groups now" — the one write the dashboard makes.
 *
 * The backend answers 202, not 200: locking queues the matching run rather than
 * performing it, so a success here means the work was accepted and the room map
 * will fill in over the next few polls. The button reflects that by going back
 * to idle and letting the poll show the tables, rather than claiming groups
 * exist the moment the request returns.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const token = await readOrganizerSession();
  if (!token) return NextResponse.json({ code: "unauthorized" }, { status: 401 });

  const outcome = await fetchFromBackend<unknown>(
    `/v1/events/${eventId}/lock`,
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
