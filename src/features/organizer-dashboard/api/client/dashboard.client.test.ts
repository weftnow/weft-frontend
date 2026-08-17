import { afterEach, describe, expect, test } from "bun:test";
import { createEvent, DashboardClientError } from "./dashboard.client";

const realFetch = globalThis.fetch;

type Call = { url: string; init: RequestInit };

function stubFetch(status: number, body: unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("createEvent", () => {
  test("posts the event to our own route handler, not the backend", () => {
    // The organizer's token is in an httpOnly cookie the browser cannot read,
    // so a direct call to weft_core would arrive unauthenticated.
    const calls = stubFetch(201, { id: "e1" });
    createEvent({
      name: "Founder Night",
      starts_at: null,
      group_size_target: 5,
      ends_at: null,
      timezone: null,
      location: null,
      description: null,
      capacity: null,
    });
    expect(calls[0]?.url).toBe("/api/organizer/events");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
      name: "Founder Night",
      starts_at: null,
      group_size_target: 5,
      ends_at: null,
      timezone: null,
      location: null,
      description: null,
      capacity: null,
    });
  });

  test("returns the created event so the caller can navigate to it", async () => {
    stubFetch(201, { id: "e1", name: "Founder Night", state: "open" });
    const event = await createEvent({
      name: "Founder Night",
      starts_at: null,
      group_size_target: 5,
      ends_at: null,
      timezone: null,
      location: null,
      description: null,
      capacity: null,
    });
    expect(event.id).toBe("e1");
  });

  test("an expired session surfaces as unauthorized, not a generic failure", async () => {
    stubFetch(401, { code: "unauthorized" });
    const reason = await createEvent({
      name: "N",
      starts_at: null,
      group_size_target: 5,
      ends_at: null,
      timezone: null,
      location: null,
      description: null,
      capacity: null,
    }).catch((error: unknown) => error);
    // instanceof rather than expect().toBeInstanceOf(): the matcher exists at
    // runtime but is missing from the bun:test types this project compiles
    // against, and tsc --noEmit is meant to stay quiet.
    expect(reason instanceof DashboardClientError).toBe(true);
    expect((reason as DashboardClientError).code).toBe("unauthorized");
  });
});
