import { expect, test } from "bun:test";
import { loadGroup } from "./groupReveal.gateway";

test("maps a hidden group to waiting without exposing its credential", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.test";
  const cookie = "weft_attendee_123456781234123412341234567890ab=session-handle";
  const result = await loadGroup("form", cookie, async (url) => String(url).includes("/resume") ? new Response(null, { status: 302, headers: { location: "/a/token", "x-weft-event-id": "12345678-1234-1234-1234-1234567890ab" } }) : new Response(null, { status: 204 }));
  expect(result).toEqual({ status: "waiting" });
});
