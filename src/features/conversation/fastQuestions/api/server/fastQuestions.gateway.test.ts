import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  backendIcebreakerPayload as payload,
  VIEWER_ID as VIEWER,
} from "../../test/backendIcebreakerFixture";
import {
  attendeeCookieName,
  createFastQuestionsGateway,
  FastQuestionsGatewayError,
} from "./fastQuestions.gateway";

// The payload comes from the shared fixture rather than being written here:
// a locally authored one is what let this suite pass against a backend shape
// that did not exist. See the fixture's own comment.
const EVENT_ID = "8f14e45f-ea0c-4d6b-9f1c-2b3a4c5d6e7f";

const previousBaseUrl = process.env.WEFT_B2B_API_URL;

beforeEach(() => {
  process.env.WEFT_B2B_API_URL = "http://backend.test";
});

afterEach(() => {
  if (previousBaseUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = previousBaseUrl;
});

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

test("the backend's viewer is the one participant marked as you", async () => {
  // The token never reaches the browser, so `viewer` is the only thing that
  // can tell this phone which row in participant_order is its own.
  const gateway = createFastQuestionsGateway(withToken, async () => respond(payload()));

  const session = await gateway.get(EVENT_ID);
  if (session.phaseId !== "phase_1") throw new Error("expected a phase-1 session");

  const mine = session.participants.filter((participant) => participant.isCurrentUser);
  expect(mine.map((participant) => participant.id)).toEqual([VIEWER]);
});

test("the whole deck arrives, not just the live round", async () => {
  // The screen renders `rounds[roundIndex]`, so a payload carrying only the
  // current question leaves it with nothing to draw.
  const gateway = createFastQuestionsGateway(withToken, async () =>
    respond(payload({ round: 2, turn_index: 0 })),
  );

  const session = await gateway.get(EVENT_ID);
  if (session.phaseId !== "phase_1") throw new Error("expected a phase-1 session");

  expect(session.rounds.map((round) => round.participantDurationSeconds)).toEqual([30, 45, 60]);
  expect(session.rounds[session.roundIndex]?.question).toBe("Two");
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

/**
 * This used to leave as a bare `Error`, slip past the route's error mapping and
 * reach the guest as a 500 — while the same misconfiguration in the feedback
 * gateway answered 503. One misconfiguration, one answer.
 */
test("a missing base URL is a typed unavailable, not a bare throw", async () => {
  delete process.env.WEFT_B2B_API_URL;
  const gateway = createFastQuestionsGateway(withToken, async () => respond(payload()));

  const error = await gateway.get(EVENT_ID).catch((caught: unknown) => caught);
  expect(error instanceof FastQuestionsGatewayError).toBe(true);
  expect((error as FastQuestionsGatewayError).code).toBe("unavailable");
});
