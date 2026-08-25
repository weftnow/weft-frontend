import { afterEach, beforeEach, expect, test } from "bun:test";
import { GroupRevealLoadError, groupRevealClient } from "./groupReveal.api";

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

test("maps an authenticated session failure to no_session", async () => {
  globalThis.fetch = (async () => Response.json({ code: "no_session" }, { status: 401 })) as typeof fetch;

  try {
    await groupRevealClient.load("token-valid-123456");
    throw new Error("expected group load to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(GroupRevealLoadError);
    expect((error as GroupRevealLoadError).kind).toBe("no_session");
  }
});

test("maps service failures to unavailable", async () => {
  globalThis.fetch = (async () => new Response(null, { status: 503 })) as typeof fetch;

  try {
    await groupRevealClient.load("token-valid-123456");
    throw new Error("expected group load to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(GroupRevealLoadError);
    expect((error as GroupRevealLoadError).kind).toBe("unavailable");
  }
});

test("maps malformed session failures to unavailable", async () => {
  globalThis.fetch = (async () => new Response("{", { status: 401, headers: { "Content-Type": "application/json" } })) as typeof fetch;

  try {
    await groupRevealClient.load("token-valid-123456");
    throw new Error("expected group load to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(GroupRevealLoadError);
    expect((error as GroupRevealLoadError).kind).toBe("unavailable");
  }
});

test("maps rejected fetches to unavailable", async () => {
  globalThis.fetch = (async () => { throw new Error("network down"); }) as typeof fetch;

  try {
    await groupRevealClient.load("token-valid-123456");
    throw new Error("expected group load to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(GroupRevealLoadError);
    expect((error as GroupRevealLoadError).kind).toBe("unavailable");
  }
});

test("maps an ended event to event_over rather than a retryable failure", async () => {
  globalThis.fetch = (async () =>
    Response.json({ code: "event_over" }, { status: 410 })) as typeof fetch;

  try {
    await groupRevealClient.load("token-valid-123456");
    throw new Error("expected group load to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(GroupRevealLoadError);
    expect((error as GroupRevealLoadError).kind).toBe("event_over");
  }
});
