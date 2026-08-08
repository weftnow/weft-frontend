import { afterEach, beforeEach, expect, test } from "bun:test";
import { formSubmissionSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";
import { POST } from "./route";

const validSubmission = formSubmissionSchema.parse({
  form_version: "v1",
  language: "en",
  name: "Ana",
  email: null,
  phone: null,
  company: null,
  t1: "Raise a seed round for my fintech",
  t2: "An angel who knows LatAm fintech",
  s1_situation: "own_business",
  s1_function: "engineering_product",
  s2: 3,
  s3: "up",
  s4: ["raise_capital"],
  s5: ["experience"],
  s6: 2,
  s7: 2,
  s8: 1,
  s9: 3,
  s10: 3,
});

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

test("submit route returns only completion and forwards HttpOnly cookie", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ attendee_token: "attendee-secret" }), {
      status: 201,
      headers: {
        "content-type": "application/json",
        "set-cookie": "weft_attendee_event=attendee-secret; HttpOnly; SameSite=lax; Path=/",
      },
    })) as typeof fetch;

  const response = await POST(
    new Request("http://localhost/api/questionnaire/token-valid-123456/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
      },
      body: JSON.stringify(validSubmission),
    }),
    params("token-valid-123456"),
  );
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ status: "completed" });
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

test("an invalid token, missing UUID key, or invalid body is rejected before any upstream call", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({});
  }) as typeof fetch;

  const badToken = await POST(
    new Request("http://localhost/api/questionnaire/short/submit", {
      method: "POST",
      headers: { "idempotency-key": "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc" },
      body: JSON.stringify(validSubmission),
    }),
    params("short"),
  );
  expect(badToken.status).toBe(400);

  const missingKey = await POST(
    new Request("http://localhost/api/questionnaire/token-valid-123456/submit", {
      method: "POST",
      body: JSON.stringify(validSubmission),
    }),
    params("token-valid-123456"),
  );
  expect(missingKey.status).toBe(400);

  const badKey = await POST(
    new Request("http://localhost/api/questionnaire/token-valid-123456/submit", {
      method: "POST",
      headers: { "idempotency-key": "not-a-uuid" },
      body: JSON.stringify(validSubmission),
    }),
    params("token-valid-123456"),
  );
  expect(badKey.status).toBe(400);

  const badBody = await POST(
    new Request("http://localhost/api/questionnaire/token-valid-123456/submit", {
      method: "POST",
      headers: { "idempotency-key": "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc" },
      body: JSON.stringify({ name: "x" }),
    }),
    params("token-valid-123456"),
  );
  expect(badBody.status).toBe(400);

  expect(called).toBe(false);
});

test("upstream conflicts map to safe bodies without upstream detail", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  globalThis.fetch = (async () =>
    Response.json(
      { detail: "the questionnaire changed; reload before submitting", code: "form_version_conflict" },
      { status: 409 },
    )) as typeof fetch;

  const response = await POST(
    new Request("http://localhost/api/questionnaire/token-valid-123456/submit", {
      method: "POST",
      headers: { "idempotency-key": "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc" },
      body: JSON.stringify(validSubmission),
    }),
    params("token-valid-123456"),
  );
  expect(response.status).toBe(409);
  const body = await response.json();
  expect(body).toEqual({ code: "versionConflict" });
  expect(JSON.stringify(body)).not.toContain("reload before submitting");
});
