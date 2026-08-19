import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { CreateEventForm } from "@/features/organizer-dashboard/components/CreateEventForm";
import { DashboardShell } from "@/features/organizer-dashboard/components/DashboardShell";
import { FirstEventIntro } from "@/features/organizer-dashboard/components/FirstEventIntro";
import { formatEventDate } from "@/features/organizer-dashboard/model/eventDate.model";
import {
  eventListSchema,
  type EventSummaryRow,
} from "@/features/organizer-dashboard/schemas/dashboard.schema";
import authStyles from "@/features/organizer-auth/components/OrganizerAuth.module.css";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Organizer dashboard | Weft",
  description: "Your Weft organizer dashboard.",
  robots: { index: false, follow: false },
};

/**
 * An organizer with no events used to land on "No events yet. Create your first
 * event…" — an instruction the app gave them no way to follow, since nothing in
 * the frontend called POST /v1/events. The empty state became the form itself:
 * there is exactly one thing to do on this screen, so the screen is that thing.
 *
 * The form is still the screen, but it is no longer alone on it. A first-timer
 * was being asked for a table size having never seen a Weft room, and creating
 * the event is step one of five — the other four land over the following days,
 * so a session that ends here ends with no feedback at all. FirstEventIntro
 * supplies the arc and a finished night to look at; the form keeps the weight.
 */
export function EventsList({ events }: { events: EventSummaryRow[] }) {
  // The first event is still the whole screen — no list to head it, no dashboard
  // panel to sit in — but on its own surface now rather than the auth
  // placeholder's, which centres its contents in the viewport and would push a
  // form that is no longer the first element out of sight.
  if (events.length === 0) {
    return (
      <main className={styles.firstRun}>
        <FirstEventIntro />
        <CreateEventForm />
      </main>
    );
  }
  return (
    <DashboardShell>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Your events</h1>
        {/*
          A link to its own screen rather than a <details> that unfolds the form
          in place. The disclosure suited a three-field form; the form is now two
          panes plus a settings rail, which is more than a list row should try to
          hold — and a create screen you can link to, reload and come back from is
          worth more here than the navigation it saves.

          It sits in the head opposite the title, where pageHead's existing
          space-between puts it top-right and its flex-wrap drops it under the
          title on a narrow screen rather than squeezing both.
        */}
        <Link className={styles.newEventButton} href="/organizer/events/new">
          New event
        </Link>
      </div>
      <ul className={styles.eventList}>
        {events.map((event) => (
          <li key={event.id}>
            <Link className={styles.eventRow} href={`/organizer/events/${event.id}`}>
              <span>
                <span className={styles.eventRowName}>{event.name}</span>
                <span className={styles.eventRowMeta}>
                  {formatEventDate(event.starts_at) ?? "No date set"}
                </span>
              </span>
              <span className={styles.state} data-state={event.state}>
                {event.state}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}

export function OrganizerUnavailable() {
  return (
    <main className={authStyles.dashboardPlaceholder}>
      <h1>We can&apos;t open your dashboard right now.</h1>
      <p>Your session is still here.</p>
      <Link className={authStyles.primary} href="/organizer">
        Try again
      </Link>
    </main>
  );
}

/**
 * Fetching the event list *is* the session check.
 *
 * This used to call resolveOrganizerPage first, but that validates by
 * requesting /v1/events and throwing the body away — so the page hit the same
 * endpoint twice on every load, once to learn the session was good and again
 * to learn what was in it. One request answers both questions: a 401 means
 * bounce to login, a body means render it.
 */
export default async function OrganizerPage() {
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");

  const outcome = await fetchFromBackend<unknown>("/v1/events", token);
  if (outcome.status === "unauthorized") redirect("/organizer/login");
  if (outcome.status !== "ok") return <OrganizerUnavailable />;

  const parsed = eventListSchema.safeParse(outcome.data);
  if (!parsed.success) return <OrganizerUnavailable />;
  return <EventsList events={parsed.data} />;
}
