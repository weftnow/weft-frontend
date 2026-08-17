import { afterEach, beforeEach, expect, mock, test } from "bun:test";

/**
 * The one write that creates something.
 *
 * readOrganizerSession reads next/headers, which only resolves inside a real
 * request scope — hence the module mock rather than the plain global-fetch stub
 * the organizer-auth route tests use. What is worth pinning here is that the
 * token never reaches the browser and that a missing session costs nothing:
 * no backend call at all.
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
  return new Request("http://localhost/api/organizer/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("a created event comes back with the form token the organizer needs", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Response.json(
      { id: "e1", name: "Founder Night", state: "open", form_token: "abc123" },
      { status: 201 },
    );
  }) as unknown as typeof fetch;

  const response = await POST(
    createRequest({ name: "Founder Night", starts_at: null, group_size_target: 5 }),
  );

  expect(response.status).toBe(201);
  const created = await response.json() as { id: string; form_token: string };
  expect(created.id).toBe("e1");
  expect(created.form_token).toBe("abc123");
  expect(calls[0]?.url).toBe("https://b2b.example.test/v1/events");
  expect((calls[0]?.init.headers as Record<string, string>).Authorization)
    .toBe("Bearer organizer-jwt");
  expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
    name: "Founder Night",
    starts_at: null,
    group_size_target: 5,
  });
});

test("no session means no backend call at all", async () => {
  sessionToken = null;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({});
  }) as unknown as typeof fetch;

  const response = await POST(createRequest({ name: "N" }));

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "unauthorized" });
  expect(called).toBe(false);
});

test("a backend that is down becomes 503, not a half-created event", async () => {
  globalThis.fetch = (async () =>
    Response.json({ detail: "boom" }, { status: 500 })) as unknown as typeof fetch;

  const response = await POST(createRequest({ name: "N" }));

  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ code: "unavailable" });
});

test("an expired token becomes 401 so the form can bounce to login", async () => {
  globalThis.fetch = (async () =>
    Response.json({ detail: "expired" }, { status: 401 })) as unknown as typeof fetch;

  const response = await POST(createRequest({ name: "N" }));

  expect(response.status).toBe(401);
});
