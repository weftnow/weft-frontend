import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  attendeeCookieName,
  createEventFeedbackGateway,
  EventFeedbackGatewayError,
} from "./eventFeedback.gateway";

const EVENT_ID = "8f14e45f-ea0c-4d6b-9f1c-2b3a4c5d6e7f";
const TOKEN = "signed-attendee-token";

const previousBaseUrl = process.env.WEFT_B2B_API_URL;

beforeEach(() => {
  process.env.WEFT_B2B_API_URL = "http://backend.test";
});

afterEach(() => {
  if (previousBaseUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = previousBaseUrl;
});

function gateway(fetchImpl: typeof fetch) {
  return createEventFeedbackGateway(async () => TOKEN, fetchImpl);
}

/** A guest with no cookie: the reader resolves to undefined, not to a token. */
function gatewayWithoutToken(fetchImpl: typeof fetch) {
  return createEventFeedbackGateway(async () => undefined, fetchImpl);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("the cookie name matches the backend's per-event name", () => {
  expect(attendeeCookieName(EVENT_ID)).toBe("weft_attendee_8f14e45fea0c4d6b9f1c2b3a4c5d6e7f");
});

test("reads the submitted status from the backend", async () => {
  const seen: string[] = [];
  const api = gateway(async (url) => {
    seen.push(String(url));
    return json({ submitted: true });
  });

  expect(await api.status(EVENT_ID)).toEqual({ submitted: true });
  expect(seen[0]).toBe(`http://backend.test/a/${TOKEN}/event-feedback`);
});

test("sends the answers under the backend's snake_case names", async () => {
  let body: unknown = null;
  const api = gateway(async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return json({ status: "recorded" }, 201);
  });

  await api.submit(EVENT_ID, { recommendScore: 9, rating: 4, improvement: "More time." });

  expect(body).toEqual({ recommend_score: 9, rating: 4, improvement: "More time." });
});

test("a duplicate submission is reported as already submitted, not as a failure", async () => {
  const api = gateway(async () => json({ detail: "event feedback already recorded" }, 409));

  const error = await api
    .submit(EVENT_ID, { recommendScore: 5, rating: 3, improvement: "x" })
    .catch((caught: unknown) => caught);

  expect((error as Error).name).toBe("EventFeedbackGatewayError");
  expect((error as EventFeedbackGatewayError).code).toBe("already_submitted");
});

test("a missing cookie never reaches the network", async () => {
  let called = false;
  const api = gatewayWithoutToken(async () => {
    called = true;
    return json({ submitted: false });
  });

  const error = await api.status(EVENT_ID).catch((caught: unknown) => caught);

  expect((error as EventFeedbackGatewayError).code).toBe("no_attendee_token");
  expect(called).toBe(false);
});

test("an unusable token reads the same whether it is rejected or unknown", async () => {
  for (const status of [401, 404]) {
    const api = gateway(async () => json({ detail: "no" }, status));
    const error = await api.status(EVENT_ID).catch((caught: unknown) => caught);
    expect((error as EventFeedbackGatewayError).code).toBe("no_attendee_token");
  }
});

test("a rejected body is invalid, not unavailable", async () => {
  const api = gateway(async () => json({ detail: [] }, 422));
  const error = await api
    .submit(EVENT_ID, { recommendScore: 5, rating: 3, improvement: "x" })
    .catch((caught: unknown) => caught);
  expect((error as EventFeedbackGatewayError).code).toBe("invalid");
});

test("a network failure is unavailable and leaks nothing", async () => {
  const api = gateway(async () => {
    throw new Error("ECONNREFUSED http://backend.test");
  });
  const error = await api.status(EVENT_ID).catch((caught: unknown) => caught);
  expect((error as EventFeedbackGatewayError).code).toBe("unavailable");
  expect((error as Error).message).not.toContain("backend.test");
});

test("a 200 with an unexpected shape is unavailable rather than trusted", async () => {
  const api = gateway(async () => json({ submitted: "yes" }));
  const error = await api.status(EVENT_ID).catch((caught: unknown) => caught);
  expect((error as EventFeedbackGatewayError).code).toBe("unavailable");
});
