import "server-only";

export class AttendeeSessionGatewayError extends Error {
  constructor(readonly code: "no_session" | "unavailable") { super(code); }
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
