import { expect, test } from "bun:test";
import { AttendeeSessionGatewayError, resolveAttendeeSession } from "./attendeeSession.gateway";

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
