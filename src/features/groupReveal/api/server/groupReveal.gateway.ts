import "server-only";
import { groupRevealSchema, type GroupReveal } from "../../schemas/groupReveal.schema";
import { resolveAttendeeSession } from "./attendeeSession.gateway";

export class GroupRevealGatewayError extends Error { constructor(readonly code: "no_session" | "conflict" | "unavailable") { super(code); } }
const backend = () => new URL(process.env.WEFT_B2B_API_URL ?? "");
export async function loadGroup(formToken: string, cookie: string | null, fetchImpl: typeof fetch = fetch): Promise<{ status: "waiting" } | { status: "ready"; group: GroupReveal }> {
  try { const { token } = await resolveAttendeeSession(formToken, cookie, fetchImpl); const r = await fetchImpl(new URL(`/a/${encodeURIComponent(token)}`, backend()), { cache: "no-store", signal: AbortSignal.timeout(8_000) }); if (r.status === 204) return { status: "waiting" }; if (!r.ok) throw new GroupRevealGatewayError(r.status === 401 || r.status === 404 ? "no_session" : "unavailable"); return { status: "ready", group: groupRevealSchema.parse(await r.json()) }; } catch (e) { if (e instanceof GroupRevealGatewayError) throw e; throw new GroupRevealGatewayError("unavailable"); }
}
export async function confirmGroup(formToken: string, cookie: string | null, fetchImpl: typeof fetch = fetch): Promise<void> { const { token } = await resolveAttendeeSession(formToken, cookie, fetchImpl); const r = await fetchImpl(new URL(`/a/${encodeURIComponent(token)}/confirm`, backend()), { method: "POST", cache: "no-store", signal: AbortSignal.timeout(8_000) }); if (!r.ok) throw new GroupRevealGatewayError(r.status === 409 ? "conflict" : r.status === 401 || r.status === 404 ? "no_session" : "unavailable"); }
