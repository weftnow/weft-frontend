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
  const outcome = await loadThread(null, stub(200, { pairs: [] }));
  expect(outcome.status).toBe("not_found");
});

test("one unrenderable pair sinks the response rather than vanishing", async () => {
  const broken = { ...SUMMARY, percent: 140 };
  const outcome = await loadThread("in-1", stub(200, { pairs: [SUMMARY, broken] }));
  expect(outcome.status).toBe("unavailable");
});
