import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";

export const dynamic = "force-dynamic";

/** Shell only — the groups content lands in a later task. */
export default async function GroupsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { plan } = await requireTabContext(eventId);
  return (
    <>
      <TabBar eventId={eventId} active="groups" plan={plan} />
      <p>Nothing here yet.</p>
    </>
  );
}
