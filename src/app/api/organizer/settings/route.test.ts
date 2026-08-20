import { afterEach, beforeEach, expect, mock, test } from "bun:test";

/**
 * Only the crux is pinned here. "No session means no backend call" and "a
 * backend that is down becomes 503" are already proven by the identical
 * logic in src/app/api/organizer/events/route.test.ts — what only this file
 * can catch is the badRequest branch getting dropped from the ternary and a
 * validation rejection like role_other_required coming out as a 503 instead.
 */
let sessionToken: string | null = "organizer-jwt";

mock.module("next/headers", () => ({
  cookies: async () => ({
    get: () => (sessionToken === null ? undefined : { value: sessionToken }),
  }),
}));

const { PATCH } = await import("./route");

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
  return new Request("http://localhost/api/organizer/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("a rejected save stays a 400 and keeps its code, not a 401 or a 503", async () => {
  globalThis.fetch = (async () =>
    Response.json(
      { detail: "role_other is required", code: "role_other_required" },
      { status: 400 },
    )) as unknown as typeof fetch;

  const response = await PATCH(createRequest({ role: "other" }));

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ code: "role_other_required" });
});
