import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { CreateEventForm } from "@/features/organizer-dashboard/components/CreateEventForm";
import {
  eventListSchema,
  type EventSummaryRow,
} from "@/features/organizer-dashboard/schemas/dashboard.schema";
import styles from "@/features/organizer-auth/components/OrganizerAuth.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Organizer dashboard | Weft",
  description: "Your Weft organizer dashboard.",
  robots: { index: false, follow: false },
};

/**
 * An organizer with no events used to land on "No events yet. Create your first
 * event…" — an instruction the app gave them no way to follow, since nothing in
 * the frontend called POST /v1/events. The empty state is now the form itself:
 * there is exactly one thing to do on this screen, so the screen is that thing.
 */
export function EventsList({ events }: { events: EventSummaryRow[] }) {
  if (events.length === 0) {
    return (
      <main className={styles.dashboardPlaceholder}>
        <CreateEventForm />
      </main>
    );
  }
  return (
    <main className={styles.dashboardPlaceholder}>
      <h1>Your events</h1>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <Link href={`/organizer/events/${event.id}`}>{event.name}</Link>
            <span>{event.state}</span>
          </li>
        ))}
      </ul>
      {/*
        A <details> rather than a button holding open/closed state: the
        disclosure is the only interactive thing here, and the native element
        brings keyboard support and the right screen-reader announcement with
        it. <summary> names the form, so the form drops its own heading.
      */}
      <details className={styles.newEvent}>
        <summary>New event</summary>
        <CreateEventForm heading={null} />
      </details>
    </main>
  );
}

export function OrganizerUnavailable() {
  return (
    <main className={styles.dashboardPlaceholder}>
      <h1>We can&apos;t open your dashboard right now.</h1>
      <p>Your session is still here.</p>
      <Link className={styles.primary} href="/organizer">Try again</Link>
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
