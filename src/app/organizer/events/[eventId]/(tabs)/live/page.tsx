import { loadEvent } from "@/features/organizer-dashboard/api/server/event.server";
import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { DashboardProvider } from "@/features/organizer-dashboard/components/DashboardProvider";
import { LiveRoom } from "@/features/organizer-dashboard/components/LiveRoom";
import { eventSummaryRowSchema } from "@/features/organizer-dashboard/schemas/dashboard.schema";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";

/**
 * The tab the host actually has open during the event.
 *
 * The counts render on the server so the page is useful the moment it paints;
 * the room map then polls from the browser, because that is the part that moves
 * while someone is looking at it. loadEvent is memoised per request, so asking
 * for the event here does not repeat the fetch the layout already made.
 */
export default async function LivePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { token, summary } = await requireTabContext(eventId);

  const outcome = await loadEvent(eventId, token);
  const parsed =
    outcome.status === "ok" ? eventSummaryRowSchema.safeParse(outcome.data) : null;
  const event = parsed?.success ? parsed.data : null;

  return (
    <>
      <DashboardProvider>
        <div className={styles.cardGrid}>
          <LiveRoom
            eventId={eventId}
            checkedIn={summary?.checked_in ?? 0}
            submitted={summary?.submitted ?? 0}
            // Only an open event can be locked — every later state has already
            // been through it, and offering the button again would suggest the
            // matching could be re-run.
            canLock={event?.state === "open"}
            // The starting point only. LiveRoom promotes it to "revealable"
            // off its own poll, because matching finishes after this renders.
            state={event?.state ?? "open"}
            partitionError={event?.partition_error ?? null}
          />
        </div>
      </DashboardProvider>
    </>
  );
}
