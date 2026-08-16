import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { OverviewCards } from "@/features/organizer-dashboard/components/OverviewCards";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";

/**
 * The free tier's home.
 *
 * requireTabContext has already fetched and parsed the summary — this page
 * reads it from there rather than calling the backend again, since the plan
 * that decides which tabs are locked comes off the very same payload.
 */
export default async function OverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { summary, plan } = await requireTabContext(eventId);

  return (
    <>
      <TabBar eventId={eventId} active="overview" plan={plan} />
      {summary ? (
        <OverviewCards summary={summary} />
      ) : (
        <section className={`${styles.card} ${styles.wide}`}>
          <h2>We can&apos;t load these numbers right now.</h2>
          <p className={styles.caption}>Your event is fine — refresh to try again.</p>
        </section>
      )}
    </>
  );
}
