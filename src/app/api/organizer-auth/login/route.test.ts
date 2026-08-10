import { afterEach, beforeEach, expect, test } from "bun:test";
import { POST } from "./route";

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

function loginRequest(body: unknown) {
  return new Request("http://localhost/api/organizer-auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("login returns only authenticated status and sets HttpOnly session", async () => {
  globalThis.fetch = (async () => Response.json({
    access_token: "login-secret",
    token_type: "bearer",
  })) as typeof fetch;
  const response = await POST(loginRequest({
    email: "ana@example.com",
    password: "longenough",
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "authenticated" });
  expect(response.headers.get("set-cookie") ?? "").toContain("HttpOnly");
});

test("invalid credentials remain generic", async () => {
  globalThis.fetch = (async () => Response.json(
    { detail: "invalid credentials", code: "domain_error" },
    { status: 401 },
  )) as typeof fetch;
  const response = await POST(loginRequest({
    email: "ana@example.com",
    password: "wrong",
  }));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "invalidCredentials" });
});
