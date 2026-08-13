import { afterEach, beforeEach, expect, test } from "bun:test";
import { groupRevealClient } from "./groupReveal.api";

let originalFetch: typeof fetch;
beforeEach(() => { originalFetch = globalThis.fetch; });
afterEach(() => { globalThis.fetch = originalFetch; });

test("encodes form tokens and treats 204 as normal waiting", async () => {
  let url = "";
  globalThis.fetch = (async (input) => { url = String(input); return new Response(null, { status: 204 }); }) as typeof fetch;
  expect(await groupRevealClient.load("token with space")).toEqual({ status: "waiting" });
  expect(url).toBe("/api/questionnaire/token%20with%20space/group");
});

test("confirmation posts to the safe same-origin endpoint", async () => {
  let request: RequestInit | undefined;
  globalThis.fetch = (async (_input, init) => { request = init; return Response.json({ status: "confirmed" }); }) as typeof fetch;
  await groupRevealClient.confirm("token-valid-123456");
  expect(request?.method).toBe("POST");
});
