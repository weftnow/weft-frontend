import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";

export const dynamic = "force-dynamic";

/** Shell only — the overview content lands in a later task. */
export default async function OverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { plan } = await requireTabContext(eventId);
  return (
    <>
      <TabBar eventId={eventId} active="overview" plan={plan} />
      <p>Nothing here yet.</p>
    </>
  );
}
