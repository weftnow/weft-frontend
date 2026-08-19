"use client";

import { usePathname } from "next/navigation";
import { activeTabFor } from "../model/eventState.model";
import { TabBar } from "./TabBar";

/**
 * The tab bar, told which tab is current by the URL rather than by its parent.
 *
 * It used to be rendered by each of the five pages, which could each state
 * their own `active` and so needed no router. That was the cheaper arrangement
 * right up until the tabs got a loading state: a bar that belongs to the page
 * disappears with the page, so clicking a tab blanked the navigation for as
 * long as the fetch took. Living in the layout, it stays put and highlights the
 * moment you click.
 *
 * The client boundary stops here. TabBar itself is still a plain server-safe
 * component; this wrapper exists only to read the path.
 */
export function TabBarNav({
  eventId,
  plan,
}: {
  eventId: string;
  plan: "free" | "pro";
}) {
  return (
    <TabBar
      active={activeTabFor(usePathname())}
      eventId={eventId}
      plan={plan}
    />
  );
}
