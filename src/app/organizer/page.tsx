import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { resolveOrganizerPage } from "@/features/organizer-auth/model/organizerPage.model";
import styles from "@/features/organizer-auth/components/OrganizerAuth.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Organizer dashboard | Weft",
  description: "Your Weft organizer dashboard.",
  robots: { index: false, follow: false },
};

export function OrganizerPlaceholder() {
  return (
    <main className={styles.dashboardPlaceholder}>
      <h1>your event data will appear here</h1>
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

export default async function OrganizerPage() {
  const decision = await resolveOrganizerPage(await readOrganizerSession());
  if (decision.status === "redirect") redirect("/organizer/login");
  if (decision.status === "unavailable") return <OrganizerUnavailable />;
  return <OrganizerPlaceholder />;
}
