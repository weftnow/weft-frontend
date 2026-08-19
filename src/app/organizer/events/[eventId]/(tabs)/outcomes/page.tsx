import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { BonusIntros } from "@/features/organizer-dashboard/components/BonusIntros";
import { EmptyState } from "@/features/organizer-dashboard/components/EmptyState";
import { LockedTab } from "@/features/organizer-dashboard/components/LockedTab";
import { OutcomeCards } from "@/features/organizer-dashboard/components/OutcomeCards";
import {
  bonusIntroListSchema,
  outcomesSchema,
} from "@/features/organizer-dashboard/schemas/dashboard.schema";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";

/**
 * Did the night work?
 *
 * Like the Attendees tab, the locked state comes from the backend's 402 rather
 * than the summary's `plan` string — the server holding the data is the only
 * authority on who may see it.
 */
export default async function OutcomesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { token } = await requireTabContext(eventId);

  // Two independent reads, fired together. They answer different questions —
  // "did it work" and "who still needs introducing" — and the bonus list is
  // populated by the partition runner, so it has something to say on the night
  // of the event, long before any feedback exists.
  const [outcome, introsOutcome] = await Promise.all([
    fetchFromBackend<unknown>(`/v1/events/${eventId}/outcomes`, token),
    fetchFromBackend<unknown>(`/v1/events/${eventId}/bonus-intros`, token),
  ]);
  const parsed =
    outcome.status === "ok" ? outcomesSchema.safeParse(outcome.data) : null;
  const parsedIntros =
    introsOutcome.status === "ok"
      ? bonusIntroListSchema.safeParse(introsOutcome.data)
      : null;

  return (
    <>
      <div className={styles.cardGrid}>
        {outcome.status === "planRequired" ? (
          <LockedTab feature="outcomes" />
        ) : parsed?.success ? (
          <>
            <OutcomeCards outcomes={parsed.data} />
            {parsedIntros?.success ? <BonusIntros pairs={parsedIntros.data} /> : null}
          </>
        ) : (
          <section className={`${styles.card} ${styles.wide}`}>
            <EmptyState
              body="Your event is fine — refresh to try again."
              title="We can't load your results right now."
            />
          </section>
        )}
      </div>
    </>
  );
}
