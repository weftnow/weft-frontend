import { expect, test } from "bun:test";
import { GET, POST } from "./route";

const EVENT_ID = "f96564ea-6390-4523-8d73-a4a99b92f3c4";

function submission(body: unknown): Request {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("validates the event ID before touching a repository", async () => {
  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ eventId: "bad" }),
  });
  expect(response.status).toBe(400);
});

test("reports nothing submitted for a fresh event", async () => {
  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ eventId: EVENT_ID }),
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.submitted).toBe(false);
  expect(Array.isArray(body.tablemates)).toBe(true);
});

test("records a submission and then reports it", async () => {
  const eventId = "1b1a2f4c-6f1e-4f0a-9f2b-8c7d6e5f4a3b";
  const posted = await POST(
    submission({ recommendScore: 4, rating: 5, improvement: "More time at the end." }),
    { params: Promise.resolve({ eventId }) },
  );
  expect(posted.status).toBe(201);

  const status = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ eventId }),
  });
  expect(await status.json()).toEqual({ submitted: true, tablemates: [] });
});

test("a second submission is a 409, not a 500", async () => {
  const eventId = "2c2b3f5d-7f2e-4f1a-8f3b-9c8d7e6f5a4b";
  const body = { recommendScore: 3, rating: 3, improvement: "The room was loud." };

  const first = await POST(submission(body), { params: Promise.resolve({ eventId }) });
  expect(first.status).toBe(201);

  const second = await POST(submission(body), { params: Promise.resolve({ eventId }) });
  expect(second.status).toBe(409);
  expect(await second.json()).toEqual({ code: "already_submitted" });
});

test("out-of-range and empty answers are rejected before the repository", async () => {
  const bad = [
    { recommendScore: 6, rating: 3, improvement: "x" },
    { recommendScore: 0, rating: 3, improvement: "x" },
    { recommendScore: 5, rating: 0, improvement: "x" },
    { recommendScore: 5, rating: 6, improvement: "x" },
    { recommendScore: 5, rating: 3, improvement: "   " },
    { recommendScore: 5, rating: 3, improvement: "x".repeat(2001) },
    { rating: 3, improvement: "x" },
    { recommendScore: 5, improvement: "x" },
    { recommendScore: 5, rating: 3 },
  ];

  for (const body of bad) {
    const response = await POST(submission(body), {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });
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
      meetAgainRefs: ["ref-ana", "ref-beto"],
    }),
    { params: Promise.resolve({ eventId: "3d3c4a6e-8a3f-4a2b-9a4c-0d9e8f7a6b5c" }) },
  );
  expect(withRefs.status).toBe(201);

  // "Nobody" is a real answer, not a missing field.
  const without = await POST(
    submission({ recommendScore: 5, rating: 5, improvement: "Nothing." }),
    { params: Promise.resolve({ eventId: "4e4d5b7f-9b4a-4b3c-8b5d-1e0f9a8b7c6d" }) },
  );
  expect(without.status).toBe(201);
});

test("a body that is not JSON is a 400", async () => {
  const response = await POST(
    new Request("http://localhost", { method: "POST", body: "not json" }),
    { params: Promise.resolve({ eventId: EVENT_ID }) },
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

    const read = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });
    expect(read.status).toBe(503);
    expect(await read.json()).toEqual({ code: "conversation_not_configured" });

    const write = await POST(
      submission({ recommendScore: 5, rating: 3, improvement: "x" }),
      { params: Promise.resolve({ eventId: EVENT_ID }) },
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
