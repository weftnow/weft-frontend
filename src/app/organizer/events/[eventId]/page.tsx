import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { loadEvent } from "@/features/organizer-dashboard/api/server/event.server";
import { landingTab } from "@/features/organizer-dashboard/model/eventState.model";
import { eventSummaryRowSchema } from "@/features/organizer-dashboard/schemas/dashboard.schema";

export const dynamic = "force-dynamic";

/**
 * The event URL has no page of its own — it decides which tab you land on.
 *
 * An organizer opens the same link before, during and after the night, and
 * the useful screen is different each time.
 */
export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");

  const outcome = await loadEvent(eventId, token);
  if (outcome.status === "unauthorized") redirect("/organizer/login");
  if (outcome.status !== "ok") redirect(`/organizer/events/${eventId}/overview`);

  const parsed = eventSummaryRowSchema.safeParse(outcome.data);
  const tab = parsed.success ? landingTab(parsed.data.state) : "overview";
  redirect(`/organizer/events/${eventId}/${tab}`);
}
