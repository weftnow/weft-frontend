import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { loadEvent } from "@/features/organizer-dashboard/api/server/event.server";
import { eventSummaryRowSchema } from "@/features/organizer-dashboard/schemas/dashboard.schema";

export const dynamic = "force-dynamic";

/**
 * The header only.
 *
 * Each tab page renders its own TabBar, because a layout cannot read which
 * child segment rendered and so cannot say which tab is active. Every tab page
 * already fetches the summary for the organizer's plan, so passing `active`
 * from there costs nothing and avoids a client component with a mocked router
 * just to highlight one link.
 */
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");

  const outcome = await loadEvent(eventId, token);
  if (outcome.status === "unauthorized") redirect("/organizer/login");
  const event =
    outcome.status === "ok" ? eventSummaryRowSchema.safeParse(outcome.data) : null;

  return (
    <>
      <header>
        <h1>{event?.success ? event.data.name : "Event"}</h1>
        {event?.success ? (
          <span data-state={event.data.state}>{event.data.state}</span>
        ) : null}
      </header>
      {children}
    </>
  );
}
