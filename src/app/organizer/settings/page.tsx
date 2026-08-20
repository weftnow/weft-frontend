import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { DashboardShell } from "@/features/organizer-dashboard/components/DashboardShell";
import { OrganizerUnavailable } from "@/app/organizer/page";
import { SettingsCards } from "@/features/organizer-settings/components/SettingsCards";
import { organizerMeSchema } from "@/features/organizer-settings/schemas/settings.schema";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Settings | Weft",
  description: "Your Weft account settings.",
  robots: { index: false, follow: false },
};

/**
 * Fetching the profile *is* the session check, the same way the events list is
 * on /organizer: a 401 means bounce to login, a body means render it.
 */
export default async function SettingsPage() {
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");

  const outcome = await fetchFromBackend<unknown>("/v1/auth/me", token);
  if (outcome.status === "unauthorized") redirect("/organizer/login");
  if (outcome.status !== "ok") return <OrganizerUnavailable />;

  const parsed = organizerMeSchema.safeParse(outcome.data);
  if (!parsed.success) return <OrganizerUnavailable />;

  return (
    <DashboardShell active="settings">
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Settings</h1>
      </div>
      <SettingsCards organizer={parsed.data} />
    </DashboardShell>
  );
}
