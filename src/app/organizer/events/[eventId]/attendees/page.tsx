import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { AttendeeTable } from "@/features/organizer-dashboard/components/AttendeeTable";
import { LockedTab } from "@/features/organizer-dashboard/components/LockedTab";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";
import { attendeeListSchema } from "@/features/organizer-dashboard/schemas/dashboard.schema";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";

/**
 * The directory — the first thing anyone pays for.
 *
 * Reads /responses rather than /attendees: the two endpoints are named the
 * other way round from how they read here. /attendees is the seating queue
 * (name, checked in, table number), while /responses is the contact directory
 * with emails, phones and the answers people typed.
 *
 * The locked state is driven by the backend's 402, not by the `plan` string
 * from the summary. The plan decides what the tab bar looks like; only the
 * server decides what data exists. Branching on the status keeps those two
 * from ever disagreeing — and if they did, the one holding the data wins.
 */
export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { token, plan } = await requireTabContext(eventId);

  const outcome = await fetchFromBackend<unknown>(
    `/v1/events/${eventId}/responses`,
    token,
  );
  const parsed =
    outcome.status === "ok" ? attendeeListSchema.safeParse(outcome.data) : null;

  return (
    <>
      <TabBar eventId={eventId} active="attendees" plan={plan} />
      {outcome.status === "planRequired" ? (
        <LockedTab feature="attendees" />
      ) : parsed?.success ? (
        <AttendeeTable rows={parsed.data} />
      ) : (
        <section className={`${styles.card} ${styles.wide}`}>
          <h2>We can&apos;t load your attendees right now.</h2>
          <p className={styles.caption}>
            Your event is fine — refresh to try again.
          </p>
        </section>
      )}
    </>
  );
}
