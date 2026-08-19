/*
 * The (tabs) group exists so this layout stops wrapping the whole event
 * subtree. /edit needs a screen of its own — the form is two panes and does
 * not belong under a header carrying a link to itself — and a layout applies
 * to every descendant, so the only way to leave one segment out is to move
 * the rest in. Round-bracket folders contribute no path segment: every URL
 * beneath /organizer/events/{id} is exactly what it was before the move.
 */
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { loadEvent, loadSummary } from "@/features/organizer-dashboard/api/server/event.server";
import { DashboardShell } from "@/features/organizer-dashboard/components/DashboardShell";
import { EventHeader } from "@/features/organizer-dashboard/components/EventHeader";
import { TabBarNav } from "@/features/organizer-dashboard/components/TabBarNav";
import { acceptsResponses } from "@/features/organizer-dashboard/model/eventState.model";
import {
  eventSummaryRowSchema,
  summarySchema,
} from "@/features/organizer-dashboard/schemas/dashboard.schema";

export const dynamic = "force-dynamic";

/**
 * The navigation rail and the event header.
 *
 * The tab bar lives here rather than in each of the five pages. A layout
 * cannot read which child segment rendered, so TabBarNav takes the active tab
 * from the path — which costs one small client component and buys a navigation
 * that survives loading.tsx instead of vanishing with the page it belonged to.
 *
 * Both fetches here are the memoised ones every tab page also calls, so the
 * header's response count arrives without a request of its own.
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

  const [outcome, summaryOutcome] = await Promise.all([
    loadEvent(eventId, token),
    loadSummary(eventId, token),
  ]);
  if (outcome.status === "unauthorized") redirect("/organizer/login");

  const event =
    outcome.status === "ok" ? eventSummaryRowSchema.safeParse(outcome.data) : null;
  const summary =
    summaryOutcome.status === "ok"
      ? summarySchema.safeParse(summaryOutcome.data)
      : null;

  return (
    <DashboardShell>
      <EventHeader
        editHref={
          // Only an open event can be edited: locking fixes its details and
          // the backend answers 409 to anything after. Offering a control
          // that cannot work is worse than offering none.
          event?.success && acceptsResponses(event.data.state)
            ? `/organizer/events/${eventId}/edit`
            : null
        }
        endsAt={event?.success ? event.data.ends_at ?? null : null}
        location={event?.success ? event.data.location ?? null : null}
        name={event?.success ? event.data.name : "Event"}
        startsAt={event?.success ? event.data.starts_at : null}
        state={event?.success ? event.data.state : null}
        submitted={summary?.success ? summary.data.submitted : null}
      />
      <TabBarNav
        eventId={eventId}
        plan={summary?.success ? summary.data.plan : "free"}
      />
      {children}
    </DashboardShell>
  );
}
