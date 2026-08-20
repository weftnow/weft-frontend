import { afterEach, beforeEach, expect, mock, test } from "bun:test";

/**
 * The one test this file exists to pin: a wrong current password has to
 * survive as a 400 with its code intact. A 401 here would bounce the
 * organizer to the login screen for a mistake that was never about their
 * session, and a 503 would tell them the whole product is down for typing
 * one field wrong. "No session" and "backend down" are already proven by
 * src/app/api/organizer/events/route.test.ts's identical logic.
 */
let sessionToken: string | null = "organizer-jwt";

mock.module("next/headers", () => ({
  cookies: async () => ({
    get: () => (sessionToken === null ? undefined : { value: sessionToken }),
  }),
}));

const { POST } = await import("./route");

let originalFetch: typeof fetch;
let originalUrl: string | undefined;

beforeEach(() => {
  sessionToken = "organizer-jwt";
  originalFetch = globalThis.fetch;
  originalUrl = process.env.WEFT_B2B_API_URL;
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
});

function createRequest(body: unknown) {
  return new Request("http://localhost/api/organizer/settings/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("a wrong current password stays a 400 and keeps its code, not a 401", async () => {
  globalThis.fetch = (async () =>
    Response.json(
      { detail: "current password is incorrect", code: "invalid_password" },
      { status: 400 },
    )) as unknown as typeof fetch;

  const response = await POST(
    createRequest({ current_password: "wrong", new_password: "newpassword1" }),
  );

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ code: "invalid_password" });
});
