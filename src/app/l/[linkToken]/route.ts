import { AttendeeSessionGatewayError, claimAttendeeLink } from "@/features/groupReveal/api/server/attendeeSession.gateway";

/**
 * The address an attendee is sent.
 *
 * A route handler rather than a page, so the link token is spent server-side
 * and never reaches page JS or a client-side history entry. What the browser
 * keeps is the session cookie; what it sees is the group screen.
 *
 * Every exit is a redirect, never a JSON body: the caller is a guest who
 * tapped a link in a chat, and an error object on their screen is a dead end.
 * A link whose event has ended is the expected failure, so it has to land
 * somewhere that says to ask the organizer rather than on an error object.
 *
 * Where success redirects to is the room answer: a room attendee exists only
 * after /submit, so the group screen is the only place they can be. When slots
 * land, this hands off to the resolution rule in the conference spec §6 rather
 * than growing a second copy of it here.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ linkToken: string }> }) {
  const { linkToken } = await params;
  const seeOther = (path: string, cookie?: string | null) => {
    const headers = new Headers({ Location: path, "Cache-Control": "no-store" });
    if (cookie) headers.append("Set-Cookie", cookie);
    return new Response(null, { status: 302, headers });
  };
  try {
    const { formToken, setCookie } = await claimAttendeeLink(linkToken);
    return seeOther(`/questionnaire/${encodeURIComponent(formToken)}/group`, setCookie);
  } catch (error) {
    const code = error instanceof AttendeeSessionGatewayError ? error.code : "unavailable";
    // event_over and no_session both mean "this link will never work again".
    // The guest cannot tell those apart and does not need to; both are fixed
    // by asking the organizer, which is what invalidLink says.
    return seeOther(code === "unavailable" ? "/questionnaire" : "/questionnaire?reason=invalid");
  }
}
