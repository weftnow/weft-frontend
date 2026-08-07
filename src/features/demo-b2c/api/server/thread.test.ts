import { beforeEach, expect, test } from "bun:test";
import { loadThread } from "./thread";

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "Looking after your people",
  blurb: "You show up for the people close to you.",
};

const PERSON = {
  name: "Ana",
  top_values: [VALUE],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

const SUMMARY = {
  pair_id: "pair-1",
  headline: "Ana and Ben both lead with Benevolence.",
  score: 0.1544,
  percent: 52,
  band: "A real mix.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

/** A fetch that answers once, with whatever status and body the test wants. */
function stub(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
});

test("an empty thread is a result, not an error", async () => {
  const outcome = await loadThread("in-1", stub(200, { pairs: [] }));
  expect(outcome).toEqual({ status: "ok", pairs: [] });
});

test("a thread with a pair comes back whole", async () => {
  const outcome = await loadThread("in-1", stub(200, { pairs: [SUMMARY] }));
  expect(outcome).toEqual({ status: "ok", pairs: [SUMMARY] });
});

test("an unknown token is not_found", async () => {
  const outcome = await loadThread("in-1", stub(404, { detail: "unknown thread" }));
  expect(outcome.status).toBe("not_found");
});

test("an outage is unavailable", async () => {
  const outcome = await loadThread("in-1", stub(503, {}));
  expect(outcome.status).toBe("unavailable");
});

test("a missing token never reaches the backend", async () => {
  // Not an error, and not worth an upstream round trip: it is the ordinary
  // state of someone who received a link but hasn't opened it yet.
  let called = false;
  const spy = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;

  expect(await loadThread(null, spy)).toEqual({ status: "not_found" });
  expect(called).toBe(false);
});

test("an empty token is treated the same as no token", async () => {
  expect(await loadThread("", stub(200, {}))).toEqual({ status: "not_found" });
});

test("an absurdly long return token is refused before it reaches the wire", async () => {
  // Matches lib/server/pair.ts: nothing near 128 chars is a real token,
  // and refusing locally means a garbage token cannot probe the backend.
  let called = false;
  const spy = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;

  expect(await loadThread("x".repeat(129), spy)).toEqual({ status: "not_found" });
  expect(called).toBe(false);
});

test("one unrenderable pair sinks the response rather than vanishing", async () => {
  const broken = { ...SUMMARY, percent: 140 };
  const outcome = await loadThread("in-1", stub(200, { pairs: [SUMMARY, broken] }));
  expect(outcome.status).toBe("unavailable");
});
