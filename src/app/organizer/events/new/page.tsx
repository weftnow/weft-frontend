import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { CreateEventForm } from "@/features/organizer-dashboard/components/CreateEventForm";
import authStyles from "@/features/organizer-auth/components/OrganizerAuth.module.css";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "New event | Weft",
  description: "Create a Weft event.",
  robots: { index: false, follow: false },
};

/**
 * Creating an event, on its own screen.
 *
 * The list used to reveal this form inline behind a <details>. That was right
 * when the form was three fields; it stopped being right when the form became
 * a two-pane layout with its own settings rail, which unfolding a list row
 * cannot hold at a sensible width.
 *
 * Same full-bleed treatment as the first-event screen in `/organizer`, because
 * it is the same job: there is exactly one thing to do here, so the screen is
 * that thing.
 */
export default async function NewEventPage() {
  // The list page proves the session by fetching /v1/events. There is nothing
  // to fetch here, so this checks the cookie and lets the create request itself
  // report a session that expired in between — CreateEventForm already routes
  // an unauthorized response back to the login screen.
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");

  return (
    <main className={authStyles.dashboardPlaceholder}>
      <div className={styles.newEventPage}>
        <Link className={styles.backLink} href="/organizer">
          ← All events
        </Link>
        <CreateEventForm heading="Create event" />
      </div>
    </main>
  );
}
