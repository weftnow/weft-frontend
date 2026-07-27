import { beforeEach, describe, expect, test } from "bun:test";
import { isPairSummary, loadMyPairs } from "./myPairs";

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

describe("isPairSummary", () => {
  test("accepts a pair carrying its own id", () => {
    expect(isPairSummary(SUMMARY)).toBe(true);
  });

  test("rejects a pair with no id, which could not be linked to", () => {
    const { pair_id: _id, ...noId } = SUMMARY;
    expect(isPairSummary(noId)).toBe(false);
  });

  test("rejects an id that is not a string", () => {
    expect(isPairSummary({ ...SUMMARY, pair_id: 7 })).toBe(false);
  });

  test("still enforces everything a pair result must have", () => {
    // The id is additive; it does not loosen the underlying guard.
    expect(isPairSummary({ ...SUMMARY, score: Number.NaN })).toBe(false);
    expect(isPairSummary({ ...SUMMARY, people: [PERSON] })).toBe(false);
  });
});

describe("loadMyPairs", () => {
  test("no cookie means nobody has answered on this browser", async () => {
    // Not an error, and not worth an upstream round trip: it is the ordinary
    // state of someone who has never taken the quiz here.
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    expect(await loadMyPairs(null, spy)).toEqual({ status: "no_session" });
    expect(called).toBe(false);
  });

  test("an empty session id is treated the same as no cookie", async () => {
    expect(await loadMyPairs("", stub(200, {}))).toEqual({ status: "no_session" });
  });

  test("returns the pairs in the order the backend sent them", async () => {
    const second = { ...SUMMARY, pair_id: "pair-2" };
    const outcome = await loadMyPairs("sess-1", stub(200, { pairs: [second, SUMMARY] }));

    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") throw new Error("unreachable");
    // Newest first is the backend's ordering; nothing here re-sorts it.
    expect(outcome.pairs.map((p) => p.pair_id)).toEqual(["pair-2", "pair-1"]);
  });

  test("no pairs yet is a result, not a failure", async () => {
    // Someone who shared a link an hour ago and is checking back.
    expect(await loadMyPairs("sess-1", stub(200, { pairs: [] }))).toEqual({
      status: "ok",
      pairs: [],
    });
  });

  test("a session the backend has never heard of maps to not_found", async () => {
    // A cookie that outlived its session -- a backend restart, or a wiped
    // in-memory store. The person needs to start again, not retry.
    expect(await loadMyPairs("stale", stub(404, { detail: "unknown session" }))).toEqual({
      status: "not_found",
    });
  });

  test("a rejected proxy key is our problem, not the visitor's", async () => {
    expect(await loadMyPairs("sess-1", stub(401, { detail: "nope" }))).toEqual({
      status: "unavailable",
    });
  });

  test("a backend having a moment maps to unavailable", async () => {
    expect(await loadMyPairs("sess-1", stub(503, {}))).toEqual({ status: "unavailable" });
  });

  test("a body with no pairs array is unrenderable, not empty", async () => {
    // Silently showing "no matches yet" for a malformed payload would tell
    // someone their friend never answered when in fact we could not read it.
    expect(await loadMyPairs("sess-1", stub(200, { pairs: "none" }))).toEqual({
      status: "unavailable",
    });
    expect(await loadMyPairs("sess-1", stub(200, {}))).toEqual({ status: "unavailable" });
  });

  test("one unrenderable pair sinks the response rather than vanishing", async () => {
    // Dropping the bad entry would show 1 of 2 matches with no sign the other
    // existed. Better to say we could not read it.
    const broken = { ...SUMMARY, pair_id: "pair-2", band: 9 };
    expect(await loadMyPairs("sess-1", stub(200, { pairs: [SUMMARY, broken] }))).toEqual({
      status: "unavailable",
    });
  });


  test("an absurdly long session id is refused before it reaches the wire", async () => {
    // Matches loadPair's guard: nothing near 128 chars is a real session id,
    // and refusing locally means a garbage cookie cannot probe the backend.
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    expect(await loadMyPairs("x".repeat(129), spy)).toEqual({ status: "no_session" });
    expect(called).toBe(false);
  });
});
