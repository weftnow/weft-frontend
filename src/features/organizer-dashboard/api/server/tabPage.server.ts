import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { summarySchema, type DashboardSummary } from "../../schemas/dashboard.schema";
import { loadSummary } from "./event.server";

/**
 * What every tab page needs before it can render anything: a session, and the
 * organizer's plan so the TabBar knows which tabs to lock.
 *
 * The plan rides on /summary rather than a request of its own — it describes
 * the caller, not the room, so the backend attaches it to the one payload
 * every tab already fetches.
 *
 * A failed or unparseable summary falls back to "free" rather than throwing.
 * Locking a paid tab for someone entitled to it is a bad afternoon; unlocking
 * one for someone who has not paid is a privacy question — and the server
 * would refuse the underlying request anyway, so the fallback costs nothing.
 */
export async function requireTabContext(eventId: string): Promise<{
  token: string;
  summary: DashboardSummary | null;
  plan: "free" | "pro";
}> {
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");

  const outcome = await loadSummary(eventId, token);
  if (outcome.status === "unauthorized") redirect("/organizer/login");

  const parsed =
    outcome.status === "ok" ? summarySchema.safeParse(outcome.data) : null;
  const summary = parsed?.success ? parsed.data : null;
  return { token, summary, plan: summary?.plan ?? "free" };
}
