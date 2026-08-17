import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { loadEvent } from "@/features/organizer-dashboard/api/server/event.server";
import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { AttendeeTable } from "@/features/organizer-dashboard/components/AttendeeTable";
import { EmptyState } from "@/features/organizer-dashboard/components/EmptyState";
import { ExportCsvButton } from "@/features/organizer-dashboard/components/ExportCsvButton";
import { LockedTab } from "@/features/organizer-dashboard/components/LockedTab";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";
import {
  attendeeListSchema,
  eventSummaryRowSchema,
} from "@/features/organizer-dashboard/schemas/dashboard.schema";
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

  // Only for naming the download. loadEvent is memoised per request and the
  // layout has already called it, so this costs nothing.
  const eventOutcome = await loadEvent(eventId, token);
  const parsedEvent =
    eventOutcome.status === "ok"
      ? eventSummaryRowSchema.safeParse(eventOutcome.data)
      : null;
  const eventName = parsedEvent?.success ? parsedEvent.data.name : "event";

  const rows = parsed?.success ? parsed.data : null;
  const checkedIn = rows?.filter((row) => row.checked_in).length ?? 0;

  return (
    <>
      <TabBar active="attendees" eventId={eventId} plan={plan} />
      <div className={styles.cardGrid}>
        {outcome.status === "planRequired" ? (
          <LockedTab feature="attendees" />
        ) : rows ? (
          <>
            {/*
              The count lives beside the export rather than above the table:
              it is what an organizer checks before downloading, and it answers
              "is this everyone?" at the moment the question comes up.
            */}
            {rows.length > 0 ? (
              <div className={styles.toolbar}>
                <p className={styles.toolbarCount}>
                  {rows.length} {rows.length === 1 ? "guest" : "guests"} · {checkedIn}{" "}
                  checked in
                </p>
                <ExportCsvButton eventName={eventName} rows={rows} />
              </div>
            ) : null}
            <AttendeeTable rows={rows} />
          </>
        ) : (
          <section className={`${styles.card} ${styles.wide}`}>
            <EmptyState
              body="Your event is fine — refresh to try again."
              title="We can't load your attendees right now."
            />
          </section>
        )}
      </div>
    </>
  );
}
