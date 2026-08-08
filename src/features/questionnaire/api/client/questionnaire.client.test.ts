import { afterEach, beforeEach, expect, test } from "bun:test";
import { formDefinitionSchema } from "../../schemas/questionnaire.contract.schema";
import { backendFormEs } from "../../test/backendFormFixtures";
import { mapQuestionnaireDefinition } from "../../model/questionnaire.mapper";
import { QuestionnaireClientError, questionnaireClient } from "./questionnaire.client";

let originalFetch: typeof fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("loadLanguage encodes the token and requests the given language", async () => {
  let requestedUrl = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrl = String(input);
    return Response.json(mapQuestionnaireDefinition(formDefinitionSchema.parse(backendFormEs)));
  }) as typeof fetch;

  const questionnaire = await questionnaireClient.loadLanguage("token with space", "es");
  expect(requestedUrl).toContain("/api/questionnaire/token%20with%20space?lang=es");
  expect(questionnaire.language).toBe("es");
});

test("loadLanguage converts a safe failure body into QuestionnaireClientError", async () => {
  globalThis.fetch = (async () =>
    Response.json({ code: "notFound" }, { status: 404 })) as typeof fetch;

  try {
    await questionnaireClient.loadLanguage("token-valid-123456", "en");
    throw new Error("expected loadLanguage to reject");
  } catch (error) {
    expect(error instanceof QuestionnaireClientError).toBe(true);
    if (error instanceof QuestionnaireClientError) {
      expect(error.data.code).toBe("notFound");
    }
  }
});

test("submit sends the idempotency header and requires completion", async () => {
  let sentHeaders: Headers | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sentHeaders = new Headers(init?.headers);
    return Response.json({ status: "completed" }, { status: 201 });
  }) as typeof fetch;

  await questionnaireClient.submit(
    "token-valid-123456",
    "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
    {} as never,
  );
  expect(sentHeaders?.get("Idempotency-Key")).toBe("91acb4f0-77e4-4d7b-9ed9-cb70a44696dc");
});

test("submit rejects a non-completed body as unavailable", async () => {
  globalThis.fetch = (async () => Response.json({}, { status: 201 })) as typeof fetch;

  try {
    await questionnaireClient.submit("token-valid-123456", "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc", {} as never);
    throw new Error("expected submit to reject");
  } catch (error) {
    expect(error instanceof QuestionnaireClientError).toBe(true);
    if (error instanceof QuestionnaireClientError) {
      expect(error.data.code).toBe("unavailable");
    }
  }
});

test("submit converts a safe conflict body into QuestionnaireClientError with its code", async () => {
  globalThis.fetch = (async () =>
    Response.json({ code: "idempotencyConflict" }, { status: 409 })) as typeof fetch;

  try {
    await questionnaireClient.submit("token-valid-123456", "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc", {} as never);
    throw new Error("expected submit to reject");
  } catch (error) {
    expect(error instanceof QuestionnaireClientError).toBe(true);
    if (error instanceof QuestionnaireClientError) {
      expect(error.data.code).toBe("idempotencyConflict");
    }
  }
});
