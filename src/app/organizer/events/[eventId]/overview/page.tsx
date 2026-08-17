import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { IntentChart } from "@/features/organizer-dashboard/components/IntentChart";
import { OverviewCards } from "@/features/organizer-dashboard/components/OverviewCards";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";
import { intentSchema } from "@/features/organizer-dashboard/schemas/dashboard.schema";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";

/**
 * The free tier's home.
 *
 * requireTabContext has already fetched and parsed the summary — this page
 * reads it from there rather than calling the backend again, since the plan
 * that decides which tabs are locked comes off the very same payload.
 *
 * The intent chart is a second request, and a failing one drops the chart while
 * leaving the cards standing. The two answer different questions, so there is
 * no reason for one being unavailable to blank the other.
 */
export default async function OverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { token, summary, plan } = await requireTabContext(eventId);

  const intentOutcome = await fetchFromBackend<unknown>(
    `/v1/events/${eventId}/intent`,
    token,
  );
  const parsedIntent =
    intentOutcome.status === "ok" ? intentSchema.safeParse(intentOutcome.data) : null;
  const intent = parsedIntent?.success ? parsedIntent.data : null;

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
      {intent ? (
        <IntentChart asks={intent.asks} offers={intent.offers} language="en" />
      ) : null}
    </>
  );
}
