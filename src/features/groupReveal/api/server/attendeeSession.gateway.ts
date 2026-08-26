import "server-only";

export class AttendeeSessionGatewayError extends Error {
  constructor(readonly code: "no_session" | "event_over" | "unavailable") { super(code); }
}

const baseUrl = () => {
  const value = process.env.WEFT_B2B_API_URL;
  if (!value) throw new AttendeeSessionGatewayError("unavailable");
  return new URL(value);
};

export async function resolveAttendeeSession(formToken: string, cookieHeader: string | null, fetchImpl: typeof fetch = fetch): Promise<{ token: string; eventId: string }> {
  try {
    const base = baseUrl();
    const response = await fetchImpl(new URL(`/f/${encodeURIComponent(formToken)}/resume`, base), { headers: cookieHeader ? { Cookie: cookieHeader } : {}, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(8_000) });
    // 410 means the link was real and its event has ended. Kept apart from
    // no_session because there is nowhere to send this guest back to: the
    // questionnaire that no_session offers is closed too.
    if (response.status === 410) throw new AttendeeSessionGatewayError("event_over");
    if (response.status === 401 || response.status === 404) throw new AttendeeSessionGatewayError("no_session");
    const location = response.headers.get("location");
    if (response.status !== 302 || !location) throw new AttendeeSessionGatewayError("unavailable");
    const redirect = new URL(location, base);
    if (redirect.origin !== base.origin || redirect.search || redirect.pathname.split("/").filter(Boolean).length !== 2 || !redirect.pathname.startsWith("/a/")) throw new AttendeeSessionGatewayError("no_session");
    const token = decodeURIComponent(redirect.pathname.split("/")[2]);
    // The event comes off the response header rather than the cookie jar.
    // This used to find the one cookie whose value equalled the token and read
    // the event out of its name, which stopped working when /resume began
    // minting a fresh token per call instead of echoing the stored one — the
    // cookie now holds a session handle that matches no token by value.
    const eventId = response.headers.get("x-weft-event-id");
    if (!eventId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) throw new AttendeeSessionGatewayError("unavailable");
    return { token, eventId };
  } catch (error) { if (error instanceof AttendeeSessionGatewayError) throw error; throw new AttendeeSessionGatewayError("unavailable"); }
}

/**
 * Spend a link for a session.
 *
 * Lives beside resolveAttendeeSession because it answers the same question —
 * which attendee is this browser — for the case that one cannot: a browser
 * with no cookie, which is every browser WhatsApp opens.
 *
 * The Set-Cookie comes back raw for the caller to replant on its own origin.
 * The backend and the front end are different hosts, so the cookie the backend
 * writes is not the cookie this app later reads.
 */
export async function claimAttendeeLink(linkToken: string, fetchImpl: typeof fetch = fetch): Promise<{ formToken: string; eventId: string; setCookie: string | null }> {
  try {
    const base = baseUrl();
    const response = await fetchImpl(new URL(`/l/${encodeURIComponent(linkToken)}`, base), { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (response.status === 410) throw new AttendeeSessionGatewayError("event_over");
    if (response.status === 401 || response.status === 404) throw new AttendeeSessionGatewayError("no_session");
    if (!response.ok) throw new AttendeeSessionGatewayError("unavailable");
    const body = (await response.json()) as { form_token?: unknown; event_id?: unknown };
    if (typeof body.form_token !== "string" || typeof body.event_id !== "string") throw new AttendeeSessionGatewayError("unavailable");
    return { formToken: body.form_token, eventId: body.event_id, setCookie: response.headers.get("set-cookie") };
  } catch (error) { if (error instanceof AttendeeSessionGatewayError) throw error; throw new AttendeeSessionGatewayError("unavailable"); }
}
