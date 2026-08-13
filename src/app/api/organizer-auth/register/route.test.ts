import { afterEach, beforeEach, expect, test } from "bun:test";
import { POST } from "./route";

const validBody = {
  contact_name: "Ana Restrepo",
  organization_name: "Weft Events",
  role: "event_manager",
  role_other: null,
  email: "ana@example.com",
  password: "longenough",
  timezone: "America/Bogota",
  default_language: "es",
};

let originalFetch: typeof fetch;
let originalUrl: string | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalUrl = process.env.WEFT_B2B_API_URL;
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
});

function request(body: unknown, contentType = "application/json") {
  return new Request("http://localhost/api/organizer-auth/register", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: JSON.stringify(body),
  });
}

test("successful registration sets a secure server cookie and never returns the JWT", async () => {
  globalThis.fetch = (async () => Response.json({
    access_token: "backend-secret",
    token_type: "bearer",
    organizer: {
      id: "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
      email: validBody.email,
      contact_name: validBody.contact_name,
      organization_name: validBody.organization_name,
      role: validBody.role,
      timezone: validBody.timezone,
      default_language: validBody.default_language,
      whatsapp: null,
    },
  }, { status: 201 })) as typeof fetch;

  const response = await POST(request(validBody));
  const serialized = JSON.stringify(await response.json());
  expect(response.status).toBe(201);
  expect(serialized).toBe('{"status":"authenticated"}');
  expect(serialized).not.toContain("backend-secret");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("set-cookie") ?? "").toContain("HttpOnly");
});

test("invalid content type and body fail before FastAPI", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return Response.json({});
  }) as typeof fetch;
  expect((await POST(request(validBody, "text/plain"))).status).toBe(400);
  expect((await POST(request({ ...validBody, role: "boss" }))).status).toBe(400);
  expect(calls).toBe(0);
});

test("duplicate email maps to safe frontend-owned output", async () => {
  globalThis.fetch = (async () => Response.json(
    { detail: "email ana@example.com already registered" },
    { status: 409 },
  )) as typeof fetch;
  const response = await POST(request(validBody));
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: "emailAlreadyRegistered" });
});
