import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { loadEvent } from "@/features/organizer-dashboard/api/server/event.server";
import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { EmptyState } from "@/features/organizer-dashboard/components/EmptyState";
import { IntentChart } from "@/features/organizer-dashboard/components/IntentChart";
import { OverviewCards } from "@/features/organizer-dashboard/components/OverviewCards";
import { ReadinessCard } from "@/features/organizer-dashboard/components/ReadinessCard";
import { ShareFormLink } from "@/features/organizer-dashboard/components/ShareFormLink";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";
import { acceptsResponses } from "@/features/organizer-dashboard/model/eventState.model";
import {
  eventSummaryRowSchema,
  intentSchema,
} from "@/features/organizer-dashboard/schemas/dashboard.schema";
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
 *
 * One `.cardGrid` holds everything the tab renders, so the share band, the
 * numbers, the readiness list and the intent charts all sit on one set of
 * columns. The composition is deliberately uneven — 4+2 then 3+3 — because a
 * page of equal boxes gives an organizer no clue what to read first.
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

  // Free: loadEvent is cache()d and the layout has already called it this
  // render, so reading the event here to get its form token costs no request.
  const eventOutcome = await loadEvent(eventId, token);
  const parsedEvent =
    eventOutcome.status === "ok"
      ? eventSummaryRowSchema.safeParse(eventOutcome.data)
      : null;
  const event = parsedEvent?.success ? parsedEvent.data : null;

  return (
    <>
      <TabBar active="overview" eventId={eventId} plan={plan} />
      <div className={styles.cardGrid}>
        {event?.form_token && acceptsResponses(event.state) ? (
          <ShareFormLink formToken={event.form_token} />
        ) : null}

        {summary ? (
          <>
            <OverviewCards summary={summary} />
            {event ? (
              <ReadinessCard
                groups={summary.groups}
                state={event.state}
                submitted={summary.submitted}
              />
            ) : null}
          </>
        ) : (
          <section className={`${styles.card} ${styles.wide}`}>
            <EmptyState
              body="Your event is fine — refresh to try again."
              title="We can't load these numbers right now."
            />
          </section>
        )}

        {/*
          Two empty bar charts say nothing that the readiness card has not
          already said better, so the intent pair waits until someone has
          actually answered.
        */}
        {intent && intent.respondents > 0 ? (
          <IntentChart asks={intent.asks} language="en" offers={intent.offers} />
        ) : null}
      </div>
    </>
  );
}
