import { afterEach, expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { conversationApi, FastQuestionsApiError, formTokenConversationApi } from "./fastQuestions.api";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("loads and validates the canonical event session", async () => {
  const eventId = "8f39ad30-f5f4-4404-8760-592e69794816";
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    calls.push(String(input));
    return Response.json(createMockFastQuestionsSession(eventId));
  }) as typeof fetch;
  expect((await conversationApi.getConversationSession(eventId)).eventId).toBe(eventId);
  expect(calls).toEqual(["/api/events/" + eventId + "/conversation"]);
});

test("surfaces a stable unsuccessful-response error", async () => {
  globalThis.fetch = (async () =>
    Response.json({ code: "unavailable" }, { status: 503 })) as typeof fetch;
  try {
    await conversationApi.getConversationSession(
      "4c22054a-00ea-49a2-8172-c009c9e78152",
    );
    throw new Error("Expected request to fail");
  } catch (error) {
    expect(error instanceof FastQuestionsApiError).toBe(true);
    expect((error as FastQuestionsApiError).status).toBe(503);
  }
});

test("rejects an invalid event ID before making a request", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({});
  }) as typeof fetch;
  await expect(conversationApi.getConversationSession("not-a-uuid")).rejects.toThrow();
  expect(called).toBe(false);
});

test("posts to start and returns the validated session", async () => {
  const eventId = "1c2e3f4a-5b6c-4d7e-8f90-1a2b3c4d5e6f";
  const calls: Array<{ url: string; method?: string }> = [];
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), method: init?.method });
    return Response.json(createMockFastQuestionsSession(eventId));
  }) as typeof fetch;
  const session = await conversationApi.startFastQuestionsPhase(eventId);
  expect(session.eventId).toBe(eventId);
  expect(calls).toEqual([
    { url: "/api/events/" + eventId + "/conversation/start", method: "POST" },
  ]);
});

test("posts an advance request with a validated body", async () => {
  const eventId = "2d3e4f5a-6b7c-4d8e-9f01-2a3b4c5d6e7f";
  const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
  globalThis.fetch = (async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return Response.json(createMockFastQuestionsSession(eventId));
  }) as typeof fetch;
  const session = await conversationApi.advanceParticipantTurn(eventId, {
    roundIndex: 0,
    participantIndex: 0,
  });
  expect(session.eventId).toBe(eventId);
  expect(calls).toEqual([
    {
      url: "/api/events/" + eventId + "/conversation/advance",
      method: "POST",
      body: { roundIndex: 0, participantIndex: 0 },
    },
  ]);
});

test("form-token transport encodes its key for every operation", async () => {
  const formToken = "token-valid-123456";
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    calls.push(String(input));
    return Response.json(createMockFastQuestionsSession("8f39ad30-f5f4-4404-8760-592e69794816"));
  }) as typeof fetch;
  await formTokenConversationApi.getConversationSession(formToken);
  await formTokenConversationApi.startFastQuestionsPhase(formToken);
  await formTokenConversationApi.advanceParticipantTurn(formToken, { roundIndex: 0, participantIndex: 0 });
  await formTokenConversationApi.continueToPhaseTwo(formToken);
  expect(calls).toEqual([
    `/api/questionnaire/${formToken}/conversation`,
    `/api/questionnaire/${formToken}/conversation/start`,
    `/api/questionnaire/${formToken}/conversation/advance`,
    `/api/questionnaire/${formToken}/conversation/continue`,
  ]);
});
