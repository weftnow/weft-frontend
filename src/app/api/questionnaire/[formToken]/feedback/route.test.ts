import { expect, test } from "bun:test";
import { GET, POST } from "./route";

/**
 * Ported from the event-id route this replaces. Same guarantees, keyed by the
 * form token — the only identifier a session can be resolved from, which is
 * why the old route could never save anything.
 */
const FORM_TOKEN = "ImY5NjU2NGVhLTYzOTAtNDUyMy04ZDczIg.aJvKxQ.signature";

function params(formToken: string) {
  return { params: Promise.resolve({ formToken }) };
}

function submission(body: unknown): Request {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Distinct tokens stand for distinct guests, so one test cannot lock another. */
function token(suffix: string): string {
  return `${FORM_TOKEN}-${suffix}`;
}

test("validates the form token before touching a repository", async () => {
  const response = await GET(new Request("http://localhost"), params("bad"));
  expect(response.status).toBe(400);
});

test("reports nothing submitted for a fresh session", async () => {
  const response = await GET(new Request("http://localhost"), params(token("fresh")));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.submitted).toBe(false);
  expect(Array.isArray(body.tablemates)).toBe(true);
});

test("records a submission and then reports it", async () => {
  const guest = token("records");
  const posted = await POST(
    submission({
      recommendScore: 4,
      rating: 5,
      improvement: "More time at the end.",
      platformPreference: "weft",
    }),
    params(guest),
  );
  expect(posted.status).toBe(201);

  const status = await GET(new Request("http://localhost"), params(guest));
  expect(await status.json()).toEqual({ submitted: true, tablemates: [] });
});

test("a second submission is a 409, not a 500", async () => {
  const guest = token("twice");
  const body = {
    recommendScore: 3,
    rating: 3,
    improvement: "The room was loud.",
    platformPreference: "gomatch",
  };

  expect((await POST(submission(body), params(guest))).status).toBe(201);

  const second = await POST(submission(body), params(guest));
  expect(second.status).toBe(409);
  expect(await second.json()).toEqual({ code: "already_submitted" });
});

test("out-of-range and empty answers are rejected before the repository", async () => {
  const ok = { platformPreference: "weft" };
  const bad = [
    { recommendScore: 6, rating: 3, improvement: "x", ...ok },
    { recommendScore: 0, rating: 3, improvement: "x", ...ok },
    { recommendScore: 5, rating: 0, improvement: "x", ...ok },
    { recommendScore: 5, rating: 6, improvement: "x", ...ok },
    { recommendScore: 5, rating: 3, improvement: "   ", ...ok },
    { recommendScore: 5, rating: 3, improvement: "x".repeat(2001), ...ok },
    { rating: 3, improvement: "x", ...ok },
    { recommendScore: 5, improvement: "x", ...ok },
    { recommendScore: 5, rating: 3, ...ok },
    // The platform question is required and closed to the two names.
    { recommendScore: 5, rating: 3, improvement: "x" },
    { recommendScore: 5, rating: 3, improvement: "x", platformPreference: "neither" },
  ];

  for (const body of bad) {
    const response = await POST(submission(body), params(FORM_TOKEN));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "invalid_body" });
  }
});

test("meet-again refs are accepted, and omitting them is a valid answer", async () => {
  const withRefs = await POST(
    submission({
      recommendScore: 5,
      rating: 5,
      improvement: "Nothing.",
      platformPreference: "gomatch",
      meetAgainRefs: ["ref-ana", "ref-beto"],
    }),
    params(token("refs")),
  );
  expect(withRefs.status).toBe(201);

  // "Nobody" is a real answer, not a missing field.
  const without = await POST(
    submission({
      recommendScore: 5,
      rating: 5,
      improvement: "Nothing.",
      platformPreference: "gomatch",
    }),
    params(token("no-refs")),
  );
  expect(without.status).toBe(201);
});

test("a body that is not JSON is a 400", async () => {
  const response = await POST(
    new Request("http://localhost", { method: "POST", body: "not json" }),
    params(FORM_TOKEN),
  );
  expect(response.status).toBe(400);
});

/**
 * The failure this route exists to avoid: an unmapped throw becomes a 500 and
 * strands the guest on a retry button that can never work.
 */
test("a source-configuration failure is a 503 with a code, never a 500", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSource = process.env.WEFT_CONVERSATION_SOURCE;
  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    Reflect.set(process.env, "WEFT_CONVERSATION_SOURCE", "other");

    const read = await GET(new Request("http://localhost"), params(FORM_TOKEN));
    expect(read.status).toBe(503);
    expect(await read.json()).toEqual({ code: "conversation_not_configured" });

    const write = await POST(
      submission({
        recommendScore: 5,
        rating: 3,
        improvement: "x",
        platformPreference: "weft",
      }),
      params(FORM_TOKEN),
    );
    expect(write.status).toBe(503);
  } finally {
    if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
    if (originalSource === undefined)
      Reflect.deleteProperty(process.env, "WEFT_CONVERSATION_SOURCE");
    else Reflect.set(process.env, "WEFT_CONVERSATION_SOURCE", originalSource);
  }
});
