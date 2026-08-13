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

const ANSWERS = {
  recommendScore: 4,
  rating: 5,
  improvement: "More time.",
  meetAgain: [] as string[],
};

test("the cookie name matches the backend's per-event name", () => {
  expect(attendeeCookieName(EVENT_ID)).toBe("weft_attendee_8f14e45fea0c4d6b9f1c2b3a4c5d6e7f");
});

test("an unsubmitted guest gets the status and their tablemates", async () => {
  const seen: string[] = [];
  const api = gateway(async (url) => {
    const path = String(url);
    seen.push(path);
    if (path.endsWith("/event-feedback")) return json({ submitted: false });
    return json({ tablemates: [{ display_name: "Ana" }, { display_name: "Beto" }] });
  });

  expect(await api.status(EVENT_ID)).toEqual({
    submitted: false,
    tablemates: [{ displayName: "Ana" }, { displayName: "Beto" }],
  });
  expect(seen).toEqual([
    `http://backend.test/a/${TOKEN}/event-feedback`,
    `http://backend.test/a/${TOKEN}`,
  ]);
});

test("a guest who already submitted costs no extra request", async () => {
  const seen: string[] = [];
  const api = gateway(async (url) => {
    seen.push(String(url));
    return json({ submitted: true });
  });

  expect(await api.status(EVENT_ID)).toEqual({ submitted: true, tablemates: [] });
  expect(seen).toHaveLength(1);
});

test("an unpublished group hides the question rather than failing the screen", async () => {
  const api = gateway(async (url) => {
    if (String(url).endsWith("/event-feedback")) return json({ submitted: false });
    return new Response(null, { status: 204 });
  });

  expect(await api.status(EVENT_ID)).toEqual({ submitted: false, tablemates: [] });
});

test("sends the answers under the backend's snake_case names", async () => {
  let body: unknown = null;
  const api = gateway(async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return json({ status: "recorded" }, 201);
  });

  await api.submit(EVENT_ID, ANSWERS);

  expect(body).toEqual({ recommend_score: 4, rating: 5, improvement: "More time." });
});

test("meet-again lands before the one-shot write, so a retry cannot strand it", async () => {
  const calls: string[] = [];
  const api = gateway(async (url, init) => {
    const path = String(url);
    if (path.endsWith("/feedback")) {
      calls.push(`meet:${JSON.parse(String(init?.body)).to_display_name}`);
      return json({ status: "recorded" }, 201);
    }
    calls.push("event-feedback");
    return json({ status: "recorded" }, 201);
  });

  await api.submit(EVENT_ID, { ...ANSWERS, meetAgain: ["Ana", "Beto"] });

  expect(calls).toEqual(["meet:Ana", "meet:Beto", "event-feedback"]);
});

test("a meet-again name already recorded is the desired end state, not a failure", async () => {
  const api = gateway(async (url) => {
    if (String(url).endsWith("/event-feedback")) return json({ status: "recorded" }, 201);
    return json({ detail: "feedback already recorded" }, 409);
  });

  await api.submit(EVENT_ID, { ...ANSWERS, meetAgain: ["Ana"] });
});

test("a name no longer at the table does not sink the whole submission", async () => {
  let recorded = false;
  const api = gateway(async (url) => {
    if (String(url).endsWith("/event-feedback")) {
      recorded = true;
      return json({ status: "recorded" }, 201);
    }
    return json({ detail: "that person is not at your table" }, 404);
  });

  await api.submit(EVENT_ID, { ...ANSWERS, meetAgain: ["Ghost"] });
  expect(recorded).toBe(true);
});

test("a duplicate submission is reported as already submitted, not as a failure", async () => {
  const api = gateway(async () => json({ detail: "event feedback already recorded" }, 409));

  const error = await api.submit(EVENT_ID, ANSWERS).catch((caught: unknown) => caught);

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
  const error = await api.submit(EVENT_ID, ANSWERS).catch((caught: unknown) => caught);
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

/** Matches the fast questions gateway: typed, and not mislogged as a network error. */
test("a missing base URL is a typed unavailable, not a bare throw", async () => {
  delete process.env.WEFT_B2B_API_URL;
  const api = gateway(async () => json({ submitted: false }));

  const error = await api.status(EVENT_ID).catch((caught: unknown) => caught);
  expect(error instanceof EventFeedbackGatewayError).toBe(true);
  expect((error as EventFeedbackGatewayError).code).toBe("unavailable");
  expect((error as Error).message).toContain("WEFT_B2B_API_URL");
});
