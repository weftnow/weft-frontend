import { expect, test } from "bun:test";
import { resolveAttendeeSession } from "./attendeeSession.gateway";

test("resolves the attendee token from a safe resume redirect and event cookie", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.test";
  const token = "attendee-token";
  const session = await resolveAttendeeSession("form token", `weft_attendee_123456781234123412341234567890ab=${token}`, async (url, init) => {
    expect(String(url)).toBe("https://b2b.test/f/form%20token/resume");
    expect(init?.redirect).toBe("manual");
    return new Response(null, { status: 302, headers: { location: `/a/${token}` } });
  });
  expect(session.eventId).toBe("12345678-1234-1234-1234-1234567890ab");
});
