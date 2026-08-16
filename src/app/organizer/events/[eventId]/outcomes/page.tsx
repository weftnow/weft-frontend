import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";

export const dynamic = "force-dynamic";

/** Shell only — the outcomes content lands in a later task. */
export default async function OutcomesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { plan } = await requireTabContext(eventId);
  return (
    <>
      <TabBar eventId={eventId} active="outcomes" plan={plan} />
      <p>Nothing here yet.</p>
    </>
  );
}
