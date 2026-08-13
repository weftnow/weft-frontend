import { afterEach, expect, test } from "bun:test";
import { eventFeedbackApi } from "./eventFeedback.api";

const EVENT_ID = "8f14e45f-ea0c-4d6b-9f1c-2b3a4c5d6e7f";

const ANSWERS = {
  recommendScore: 4,
  rating: 5,
  improvement: "More time at the end.",
  meetAgain: [] as string[],
};

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function responds(response: () => Response) {
  globalThis.fetch = (async () => response()) as typeof fetch;
}

/**
 * An unconfigured server is the one failure a retry cannot reach. Folding it
 * into `failed` put the guest on a button that would never work, on the last
 * screen of the night — the exact failure the route's error mapping exists to
 * prevent, arriving one layer further out.
 */
test("a source-configuration 503 is its own outcome, not a retryable failure", async () => {
  responds(() => Response.json({ code: "conversation_not_configured" }, { status: 503 }));
  expect(await eventFeedbackApi.submit(EVENT_ID, ANSWERS)).toEqual({
    status: "not_configured",
  });
});

test("the status read reports an unconfigured server before the form is filled in", async () => {
  responds(() => Response.json({ code: "conversation_not_configured" }, { status: 503 }));
  expect(await eventFeedbackApi.getStatus(EVENT_ID)).toEqual({ notConfigured: true });
});

/**
 * Every other 503 stays retryable: a backend that is merely down comes back,
 * and the answers on screen are worth another attempt.
 */
test("an ordinary 503 is still a plain failure", async () => {
  responds(() => Response.json({ code: "unavailable" }, { status: 503 }));
  expect(await eventFeedbackApi.submit(EVENT_ID, ANSWERS)).toEqual({ status: "failed" });
  expect(await eventFeedbackApi.getStatus(EVENT_ID)).toEqual({ unavailable: true });
});

test("a 409 still lands on thanks and a 401 still asks for the guest's own link", async () => {
  responds(() => Response.json({ code: "already_submitted" }, { status: 409 }));
  expect(await eventFeedbackApi.submit(EVENT_ID, ANSWERS)).toEqual({
    status: "already_submitted",
  });

  responds(() => Response.json({ code: "no_attendee_token" }, { status: 401 }));
  expect(await eventFeedbackApi.submit(EVENT_ID, ANSWERS)).toEqual({
    status: "no_attendee_token",
  });
});
