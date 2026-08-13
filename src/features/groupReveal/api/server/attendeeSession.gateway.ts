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
    const matches = [...(cookieHeader ?? "").matchAll(/(?:^|;\s*)weft_attendee_([a-f0-9]{32})=([^;]+)/gi)].filter(([, , value]) => decodeURIComponent(value) === token);
    if (matches.length !== 1) throw new AttendeeSessionGatewayError("no_session");
    const hex = matches[0][1];
    return { token, eventId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` };
  } catch (error) { if (error instanceof AttendeeSessionGatewayError) throw error; throw new AttendeeSessionGatewayError("unavailable"); }
}
