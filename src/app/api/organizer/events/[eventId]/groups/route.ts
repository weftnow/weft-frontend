import { NextResponse } from "next/server";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";

/**
 * The Live tab polls this every ten seconds.
 *
 * It exists because the organizer's session is an httpOnly cookie the browser
 * cannot read — the token has to be attached server-side, so every client-side
 * dashboard read goes through a handler like this one. The tabs that render on
 * the server call the backend directly and need no proxy.
 *
 * Names are the backend's business, not this handler's: /groups returns
 * display_name as null for a free organizer before the response ever reaches
 * here, so there is nothing to strip.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const token = await readOrganizerSession();
  if (!token) return NextResponse.json({ code: "unauthorized" }, { status: 401 });

  const outcome = await fetchFromBackend<unknown>(
    `/v1/events/${eventId}/groups`,
    token,
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
  return NextResponse.json(outcome.data, {
    headers: { "Cache-Control": "no-store" },
  });
}
