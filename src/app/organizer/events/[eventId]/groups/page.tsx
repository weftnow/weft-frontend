import { fetchFromBackend } from "@/features/organizer-dashboard/api/server/dashboard.gateway";
import { requireTabContext } from "@/features/organizer-dashboard/api/server/tabPage.server";
import { LockedTab } from "@/features/organizer-dashboard/components/LockedTab";
import {
  RoomMap,
  type GroupView,
} from "@/features/organizer-dashboard/components/RoomMap";
import { TabBar } from "@/features/organizer-dashboard/components/TabBar";

export const dynamic = "force-dynamic";

/**
 * The seating plan, with names on it.
 *
 * The same RoomMap the free Live tab draws — /groups simply answers with
 * display_name populated for a pro organizer, so one component serves both
 * tiers and they cannot drift apart.
 */
export default async function GroupsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { token, plan } = await requireTabContext(eventId);

  const outcome = await fetchFromBackend<GroupView[]>(
    `/v1/events/${eventId}/groups`,
    token,
  );
  const groups = outcome.status === "ok" ? outcome.data : [];

  return (
    <>
      <TabBar eventId={eventId} active="groups" plan={plan} />
      {/*
        Gate on the plan, not on the shape of the data. Unlike Attendees and
        Outcomes there is no 402 to read here — /groups answers 200 to everyone
        and merely nulls the names — so checking `display_name === null` would
        also fire on a pro event whose partition has not run yet, and show the
        upgrade card to someone who has already paid.
      */}
      {plan === "free" ? <LockedTab feature="groups" /> : <RoomMap groups={groups} />}
    </>
  );
}
