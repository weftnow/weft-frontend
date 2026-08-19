import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { SAMPLE_NIGHT } from "@/features/organizer-dashboard/data/sampleNight";
import { DashboardShell } from "@/features/organizer-dashboard/components/DashboardShell";
import { RoomMap } from "@/features/organizer-dashboard/components/RoomMap";
import { StatTiles } from "@/features/organizer-dashboard/components/StatTiles";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sample night | Weft",
  description: "What a Weft dashboard looks like during an event.",
  robots: { index: false, follow: false },
};

/**
 * A night that already happened, for someone who has not run one.
 *
 * The real Live tab, built from the real components, fed fixed data — because
 * the question a first-timer actually has is "what am I going to be looking at
 * on the night", and every answer other than the screen itself is a worse
 * answer. Nothing here is fetched and nothing here can be acted on: there is no
 * lock button and no reveal button, since a control that does nothing teaches
 * the wrong thing about the two that cannot be undone.
 */
export function SampleNightView() {
  const seats = SAMPLE_NIGHT.groups.flatMap((group) => group.members);

  return (
    <DashboardShell>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{SAMPLE_NIGHT.name}</h1>
        <span className={styles.state} data-state="live">
          live
        </span>
      </div>

      <div className={styles.cardGrid}>
        {/* First, above everything it could be mistaken for. */}
        <p className={`${styles.sampleNotice} ${styles.wide}`} role="note">
          Sample night — everyone at these tables is invented.
          <Link className={styles.sampleNoticeBack} href="/organizer">
            Back to setup
          </Link>
        </p>

        <section className={`${styles.card} ${styles.wide}`}>
          <h2>The night so far</h2>
          <StatTiles
            lead
            stats={[
              { value: SAMPLE_NIGHT.guests, of: SAMPLE_NIGHT.guests, label: "Checked in" },
              {
                value: SAMPLE_NIGHT.confirmed,
                of: seats.length,
                label: "Found their table",
              },
              { value: SAMPLE_NIGHT.groups.length, label: "Tables" },
            ]}
          />
        </section>

        <section className={`${styles.card} ${styles.wide}`}>
          <h2>The room</h2>
          <RoomMap groups={SAMPLE_NIGHT.groups} />
        </section>

        <div className={styles.sampleFoot}>
          <p className={styles.caption}>
            This is the Live tab, {SAMPLE_NIGHT.when}. Yours fills in as guests
            answer the form.
          </p>
          <Link className={styles.newEventButton} href="/organizer">
            Create your event
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}

export default async function SampleNightPage() {
  // Behind the login like every other /organizer screen. It gives nothing away,
  // but a signed-out visitor landing on a dashboard would have to work out
  // whose it is.
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");
  return <SampleNightView />;
}
