import { afterEach, beforeEach, expect, test } from "bun:test";
import { formSubmissionSchema } from "../../schemas/questionnaire.contract.schema";
import { backendFormEs } from "../../test/backendFormFixtures";
import { loadQuestionnaire, submitQuestionnaire } from "./questionnaire.gateway";

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

beforeEach(() => {
  originalUrl = process.env.WEFT_B2B_API_URL;
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
});

test("loads and maps an uncached bilingual definition", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/f/token-valid-123456/questions?lang=es");
    expect(init?.cache).toBe("no-store");
    return Response.json(backendFormEs);
  };
  const outcome = await loadQuestionnaire("token-valid-123456", "es", fetchImpl as typeof fetch);
  expect(outcome.status).toBe("ok");
  if (outcome.status === "ok") expect(outcome.questionnaire.language).toBe("es");
});

test("maps upstream form errors without leaking the token", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const unauthorized = async () => Response.json({ detail: "bad" }, { status: 401 });
  const outcome = await loadQuestionnaire(
    "token-valid-123456",
    undefined,
    unauthorized as typeof fetch,
  );
  expect(outcome).toEqual({ status: "invalidLink" });
});

test("requires the attendee cookie and hides the response token", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const fetchImpl = async () =>
    new Response(JSON.stringify({ attendee_token: "secret-attendee-token" }), {
      status: 201,
      headers: {
        "content-type": "application/json",
        "set-cookie": "weft_attendee_event=secret-attendee-token; HttpOnly; SameSite=lax; Path=/",
      },
    });
  const outcome = await submitQuestionnaire(
    "token-valid-123456",
    "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
    validSubmission,
    fetchImpl as typeof fetch,
  );
  expect(outcome.status).toBe("ok");
  if (outcome.status === "ok") {
    expect(outcome.setCookie).toContain("HttpOnly");
    // The forwarded Set-Cookie value necessarily carries the real token —
    // that's how HttpOnly cookies reach the browser. What must never happen
    // is the token becoming its own readable field on the outcome.
    expect(Object.keys(outcome).sort()).toEqual(["setCookie", "status"]);
  }
});

const upstreamMappings = [
  [404, { detail: "missing", code: "not_found" }, { status: "notFound" }],
  [409, { detail: "closed", code: "form_not_accepting" }, { status: "notAccepting" }],
  [409, { detail: "changed", code: "form_version_conflict" }, { status: "versionConflict" }],
  [409, { detail: "reused", code: "idempotency_conflict" }, { status: "idempotencyConflict" }],
] as const;

for (const [status, body, expected] of upstreamMappings) {
  test(`maps upstream ${status} ${body.code} safely`, async () => {
    process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
    const fetchImpl = async () => Response.json(body, { status });
    expect(
      await submitQuestionnaire(
        "token-valid-123456",
        "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
        validSubmission,
        fetchImpl as typeof fetch,
      ),
    ).toEqual(expected);
  });
}

test("extracts the failing body field from FastAPI validation", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const fetchImpl = async () =>
    Response.json(
      { detail: [{ loc: ["body", "email"], msg: "invalid email", type: "value_error" }] },
      { status: 422 },
    );
  const outcome = await submitQuestionnaire(
    "token-valid-123456",
    "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
    validSubmission,
    fetchImpl as typeof fetch,
  );
  expect(outcome).toEqual({ status: "validation", field: "email" });
});

test("treats thrown fetches, 5xx, invalid JSON, and missing cookies as unavailable", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const thrown = async () => {
    throw new Error("network down");
  };
  const serverError = async () => Response.json({}, { status: 503 });
  const invalidJson = async () => new Response("not-json", { status: 200 });
  const missingCookie = async () =>
    Response.json({ attendee_token: "secret-attendee-token" }, { status: 201 });

  expect((await loadQuestionnaire("token-valid-123456", undefined, thrown as typeof fetch)).status).toBe(
    "unavailable",
  );
  expect(
    (await loadQuestionnaire("token-valid-123456", undefined, serverError as typeof fetch)).status,
  ).toBe("unavailable");
  expect(
    (await loadQuestionnaire("token-valid-123456", undefined, invalidJson as typeof fetch)).status,
  ).toBe("unavailable");
  expect(
    (
      await submitQuestionnaire(
        "token-valid-123456",
        "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
        validSubmission,
        missingCookie as typeof fetch,
      )
    ).status,
  ).toBe("unavailable");
});
