import { afterEach, beforeEach, expect, test } from "bun:test";
import { createFormTokenEventFeedbackRepository } from "./formTokenEventFeedback.repository";

const FORM_TOKEN = "ImE4YWQ5MjY0LWI4Y2UtNGVlNi1iZmFkIg.aJvKxQ.signature";
const EVENT_ID = "a8ad9264-b8ce-4ee6-bfad-8f3172a5b76c";
// What the browser actually holds: a long-lived session handle, signed with a
// different salt than the token /a/... accepts.
const COOKIE = `weft_attendee_a8ad9264b8ce4ee6bfad8f3172a5b76c=session-handle`;
const MINTED = "minted-attendee-token";

const ANSWERS = {
  recommendScore: 4,
  rating: 5,
  improvement: "More time at the end.",
  meetAgainRefs: [] as string[],
};

const previousBaseUrl = process.env.WEFT_B2B_API_URL;
const previousSource = process.env.WEFT_CONVERSATION_SOURCE;

beforeEach(() => {
  process.env.WEFT_B2B_API_URL = "http://backend.test";
  process.env.WEFT_CONVERSATION_SOURCE = "backend";
});

afterEach(() => {
  if (previousBaseUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = previousBaseUrl;
  if (previousSource === undefined) delete process.env.WEFT_CONVERSATION_SOURCE;
  else process.env.WEFT_CONVERSATION_SOURCE = previousSource;
});

/** Answers /resume with a freshly minted token, then records every later call. */
function backend(calls: { url: string; body?: string }[]): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("/resume")) {
      return new Response(null, {
        status: 302,
        headers: { location: `/a/${MINTED}`, "x-weft-event-id": EVENT_ID },
      });
    }
    calls.push({ url, body: init?.body as string | undefined });
    if (url.endsWith("/event-feedback") && init?.method === "POST") {
      return Response.json({ status: "recorded" }, { status: 201 });
    }
    return Response.json({ submitted: false }, { status: 200 });
  }) as typeof fetch;
}

/**
 * The bug this covers: the store read the `weft_attendee_*` cookie and sent its
 * value as the attendee token. That value is a session handle, which the
 * backend rejects as a forgery — so every submission was refused with a 401 and
 * no row ever reached `event_feedback`. The token has to come from /resume.
 */
test("submits with the token /resume minted, never the cookie's session handle", async () => {
  const calls: { url: string; body?: string }[] = [];
  const repository = await createFormTokenEventFeedbackRepository(
    FORM_TOKEN,
    COOKIE,
    backend(calls),
  );

  await repository.submit(FORM_TOKEN, ANSWERS);

  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe(`http://backend.test/a/${MINTED}/event-feedback`);
  expect(calls[0].url).not.toContain("session-handle");
  expect(JSON.parse(calls[0].body as string)).toEqual({
    recommend_score: 4,
    rating: 5,
    improvement: "More time at the end.",
  });
});

test("reads the submitted status with the minted token too", async () => {
  const calls: { url: string; body?: string }[] = [];
  const repository = await createFormTokenEventFeedbackRepository(
    FORM_TOKEN,
    COOKIE,
    backend(calls),
  );

  expect(await repository.status(FORM_TOKEN)).toEqual({ submitted: false, tablemates: [] });
  expect(calls[0].url).toBe(`http://backend.test/a/${MINTED}/event-feedback`);
});

/**
 * A device with no saved session cannot be told apart from one that never had a
 * link, and neither can be attributed to a guest — so it lands on the screen
 * that says so rather than on a retry button that can never succeed.
 */
test("an expired session reads as no attendee token, not as a retryable failure", async () => {
  const repository = await createFormTokenEventFeedbackRepository(
    FORM_TOKEN,
    null,
    (async () => new Response(null, { status: 404 })) as typeof fetch,
  );

  expect(repository.submit(FORM_TOKEN, ANSWERS)).rejects.toThrow("No saved session on this device");
});
