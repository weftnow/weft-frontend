import { expect, test } from "bun:test";
import { AttendeeSessionGatewayError, claimAttendeeLink, resolveAttendeeSession } from "./attendeeSession.gateway";

const EVENT_ID = "12345678-1234-1234-1234-1234567890ab";

test("resolves the minted token and names the event from the response header", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.test";
  // The cookie holds a long-lived session handle; /resume trades it for a
  // freshly minted, short-lived token. The two never match by value, which is
  // why the event id has to arrive as a header rather than be recovered from
  // whichever cookie happened to equal the token.
  const session = await resolveAttendeeSession("form token", "weft_attendee_123456781234123412341234567890ab=session-handle", async (url, init) => {
    expect(String(url)).toBe("https://b2b.test/f/form%20token/resume");
    expect(init?.redirect).toBe("manual");
    return new Response(null, { status: 302, headers: { location: "/a/minted-token", "x-weft-event-id": EVENT_ID } });
  });
  expect(session).toEqual({ token: "minted-token", eventId: EVENT_ID });
});

const codeOf = async (response: Response): Promise<string> => {
  process.env.WEFT_B2B_API_URL = "https://b2b.test";
  try {
    await resolveAttendeeSession("form", null, async () => response);
    return "resolved";
  } catch (error) {
    return error instanceof AttendeeSessionGatewayError ? error.code : "wrong-error";
  }
};

test("treats an expired or missing session as no_session", async () => {
  expect(await codeOf(new Response(null, { status: 404 }))).toBe("no_session");
});

test("refuses a redirect that names no event rather than guessing one", async () => {
  expect(await codeOf(new Response(null, { status: 302, headers: { location: "/a/minted-token" } }))).toBe("unavailable");
});

test("a room past its window reads as the event being over", async () => {
  // 410 is the backend saying the link was real and its event has ended.
  // Distinct from no_session: there is no questionnaire to send them back to.
  process.env.WEFT_B2B_API_URL = "https://b2b.test";
  const fetchImpl = (async () =>
    Response.json({ code: "event_over" }, { status: 410 })) as typeof fetch;

  try {
    await resolveAttendeeSession("token-valid-123456", null, fetchImpl);
    throw new Error("expected the session resolve to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(AttendeeSessionGatewayError);
    expect((error as AttendeeSessionGatewayError).code).toBe("event_over");
  }
});

test("a claimed link returns the form token and the cookie to replant", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.test";
  const claim = await claimAttendeeLink("lt", async (url) => {
    expect(String(url)).toBe("https://b2b.test/l/lt");
    return new Response(JSON.stringify({ form_token: "ft", event_id: EVENT_ID }), {
      status: 200,
      headers: { "content-type": "application/json", "set-cookie": "weft_attendee_abc=xyz; Path=/; HttpOnly" },
    });
  });
  expect(claim.formToken).toBe("ft");
  expect(claim.setCookie).toContain("weft_attendee_abc=xyz");
});

test("a link whose event has ended is event_over, not no_session", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.test";
  expect(claimAttendeeLink("lt", async () => new Response(null, { status: 410 }))).rejects.toThrow("event_over");
});
