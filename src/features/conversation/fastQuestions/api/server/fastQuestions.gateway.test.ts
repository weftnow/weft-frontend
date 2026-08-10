import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  attendeeCookieName,
  createFastQuestionsGateway,
  FastQuestionsGatewayError,
} from "./fastQuestions.gateway";

const EVENT_ID = "8f14e45f-ea0c-4d6b-9f1c-2b3a4c5d6e7f";
const VIEWER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const THIRD = "33333333-3333-4333-8333-333333333333";

const previousBaseUrl = process.env.WEFT_B2B_API_URL;

beforeEach(() => {
  process.env.WEFT_B2B_API_URL = "http://backend.test";
});

afterEach(() => {
  if (previousBaseUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = previousBaseUrl;
});

function payload(overrides: Record<string, unknown> = {}) {
  return {
    session_id: "44444444-4444-4444-8444-444444444444",
    status: "running",
    language: "en",
    phase: 1,
    round: 1,
    total_rounds: 3,
    question: { code: "Q001", text: "One" },
    rounds: [
      { code: "Q001", text: "One", participant_duration_seconds: 30 },
      { code: "Q031", text: "Two", participant_duration_seconds: 45 },
      { code: "Q066", text: "Three", participant_duration_seconds: 60 },
    ],
    challenge: null,
    current_participant: { attendee_id: VIEWER, name: "Ana" },
    participant_order: [
      { attendee_id: VIEWER, name: "Ana" },
      { attendee_id: OTHER, name: "Bruno" },
      { attendee_id: THIRD, name: "Carla" },
    ],
    viewer: { attendee_id: VIEWER, name: "Ana" },
    turn_index: 0,
    participant_duration_seconds: 30,
    turn_ends_at: "2026-08-09T20:15:30.000Z",
    closing_line: null,
    ...overrides,
  };
}

function respond(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status });
}

const withToken = async () => "tok-123";

test("the cookie name matches the backend's per-event scheme", () => {
  expect(attendeeCookieName(EVENT_ID)).toBe("weft_attendee_8f14e45fea0c4d6b9f1c2b3a4c5d6e7f");
});

test("get calls the icebreaker poll for the event's token", async () => {
  const calls: Array<{ url: string; method?: string }> = [];
  const gateway = createFastQuestionsGateway(withToken, async (url, init) => {
    calls.push({ url: String(url), method: init?.method });
    return respond(payload());
  });

  const session = await gateway.get(EVENT_ID);

  expect(calls[0]?.url).toBe("http://backend.test/a/tok-123/icebreaker");
  expect(calls[0]?.method).toBe("GET");
  expect(session.status).toBe("active");
  expect(session.eventId).toBe(EVENT_ID);
});

test("start posts to the start endpoint", async () => {
  const calls: Array<string> = [];
  const gateway = createFastQuestionsGateway(withToken, async (url) => {
    calls.push(String(url));
    return respond(payload());
  });

  await gateway.start(EVENT_ID);
  expect(calls[0]).toBe("http://backend.test/a/tok-123/icebreaker/start");
});

test("advance converts the zero-based round back to the backend's numbering", async () => {
  let sent: unknown;
  const gateway = createFastQuestionsGateway(withToken, async (_url, init) => {
    sent = JSON.parse(String(init?.body));
    return respond(payload({ round: 2, turn_index: 1 }));
  });

  await gateway.advance(EVENT_ID, { roundIndex: 1, participantIndex: 1 });

  // The pair is the backend's stale-tap guard, so it has to arrive intact.
  expect(sent).toEqual({ round: 2, turn_index: 1 });
});

test("a missing attendee token is its own failure, not a generic outage", async () => {
  const gateway = createFastQuestionsGateway(async () => undefined, async () => respond(payload()));

  try {
    await gateway.get(EVENT_ID);
    throw new Error("expected a gateway error");
  } catch (error) {
    expect((error as FastQuestionsGatewayError).name).toBe("FastQuestionsGatewayError");
    expect((error as FastQuestionsGatewayError).code).toBe("no_attendee_token");
  }
});

test("204 means the group has no session", async () => {
  const gateway = createFastQuestionsGateway(withToken, async () => respond(null, 204));

  try {
    await gateway.get(EVENT_ID);
    throw new Error("expected a gateway error");
  } catch (error) {
    expect((error as FastQuestionsGatewayError).code).toBe("no_session");
  }
});

test("a network failure surfaces as unavailable, not a crash", async () => {
  const gateway = createFastQuestionsGateway(withToken, async () => {
    throw new Error("boom");
  });

  try {
    await gateway.get(EVENT_ID);
    throw new Error("expected a gateway error");
  } catch (error) {
    expect((error as FastQuestionsGatewayError).code).toBe("unavailable");
  }
});

test("an unrecognised body is rejected rather than passed to the UI", async () => {
  const gateway = createFastQuestionsGateway(withToken, async () =>
    respond(payload({ participant_order: "not-an-array" })),
  );

  try {
    await gateway.get(EVENT_ID);
    throw new Error("expected a gateway error");
  } catch (error) {
    expect((error as FastQuestionsGatewayError).code).toBe("unavailable");
  }
});
