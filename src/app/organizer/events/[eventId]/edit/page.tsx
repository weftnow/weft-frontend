import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { loadEvent } from "@/features/organizer-dashboard/api/server/event.server";
import { CreateEventForm } from "@/features/organizer-dashboard/components/CreateEventForm";
import { acceptsResponses } from "@/features/organizer-dashboard/model/eventState.model";
import { eventSummaryRowSchema } from "@/features/organizer-dashboard/schemas/dashboard.schema";
import authStyles from "@/features/organizer-auth/components/OrganizerAuth.module.css";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Edit event | Weft",
  description: "Change a Weft event's details.",
  robots: { index: false, follow: false },
};

/**
 * Changing an event, on its own screen.
 *
 * Overview used to reveal this form inside one card of its grid, with the
 * numbers and charts still around it. That was the same mistake the create
 * flow made and undid: the form is two panes plus a settings rail, which is
 * more than a card in a column can hold at a readable width.
 *
 * It sits outside the (tabs) group, so it gets no event header and no tab bar
 * — a header carrying a link to this very page helps nobody, and a tab bar
 * invites the organizer to wander off mid-edit.
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");

  // Unlike the create screen there is something to fetch here — the form opens
  // holding what the event already says, so it cannot render until that
  // arrives.
  const outcome = await loadEvent(eventId, token);
  if (outcome.status === "unauthorized") redirect("/organizer/login");
  if (outcome.status !== "ok") redirect(`/organizer/events/${eventId}/overview`);

  const parsed = eventSummaryRowSchema.safeParse(outcome.data);
  if (!parsed.success) redirect(`/organizer/events/${eventId}/overview`);

  // Locking is what fixes an event's details, and the backend answers 409 to
  // any edit after it. The header stops offering the link at that point, but
  // this URL is typeable and bookmarkable, so it needs its own answer.
  if (!acceptsResponses(parsed.data.state)) {
    redirect(`/organizer/events/${eventId}/overview`);
  }

  return (
    <main className={authStyles.dashboardPlaceholder}>
      <div className={styles.newEventPage}>
        <Link className={styles.backLink} href={`/organizer/events/${eventId}`}>
          ← Back to event
        </Link>
        {/*
          No onCreated: the form's default already navigates to the event,
          which routes on to whichever tab suits its state. That is the same
          landing the create screen gets, and it retires the reload() the card
          used to do.
        */}
        <CreateEventForm event={parsed.data} mode="edit" />
      </div>
    </main>
  );
}
