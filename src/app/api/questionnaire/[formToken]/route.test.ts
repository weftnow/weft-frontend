import { afterEach, beforeEach, expect, test } from "bun:test";
import { backendFormEs } from "@/features/questionnaire/test/backendFormFixtures";
import { GET } from "./route";

let originalUrl: string | undefined;
let originalFetch: typeof fetch;

beforeEach(() => {
  originalUrl = process.env.WEFT_B2B_API_URL;
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
  globalThis.fetch = originalFetch;
});

function params(formToken: string) {
  return { params: Promise.resolve({ formToken }) };
}

test("loads a translated definition with no-store caching", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  globalThis.fetch = (async () => Response.json(backendFormEs)) as typeof fetch;

  const response = await GET(
    new Request("http://localhost/api/questionnaire/token-valid-123456?lang=es"),
    params("token-valid-123456"),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const body = await response.json();
  expect(body.language).toBe("es");
});

test("an invalid token is rejected before any upstream call", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({});
  }) as typeof fetch;

  const response = await GET(
    new Request("http://localhost/api/questionnaire/short?lang=en"),
    params("short"),
  );
  expect(response.status).toBe(400);
  expect(called).toBe(false);
});

test("a missing or invalid lang is rejected before any upstream call", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({});
  }) as typeof fetch;

  const missing = await GET(
    new Request("http://localhost/api/questionnaire/token-valid-123456"),
    params("token-valid-123456"),
  );
  expect(missing.status).toBe(400);

  const invalid = await GET(
    new Request("http://localhost/api/questionnaire/token-valid-123456?lang=fr"),
    params("token-valid-123456"),
  );
  expect(invalid.status).toBe(400);
  expect(called).toBe(false);
});

test("upstream failures map to safe bodies with no-store caching and no leaked detail", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  globalThis.fetch = (async () =>
    Response.json({ detail: "event some-internal-id not found" }, { status: 404 })) as typeof fetch;

  const response = await GET(
    new Request("http://localhost/api/questionnaire/token-valid-123456?lang=en"),
    params("token-valid-123456"),
  );
  expect(response.status).toBe(404);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const body = await response.json();
  expect(body).toEqual({ code: "notFound" });
  expect(JSON.stringify(body)).not.toContain("some-internal-id");
});
