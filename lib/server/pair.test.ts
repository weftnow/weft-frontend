import { beforeEach, describe, expect, test } from "bun:test";
import { isPairResult, loadPair } from "./pair";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const VALUE = { key: "BE", name: "Benevolence", tagline: "care up close", blurb: "..." };

const PERSON = {
  name: "Ana",
  top_values: [VALUE],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

const PAIR = {
  headline: "Ana and Ben both lead with Benevolence.",
  band: "A real mix.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
});

describe("loadPair", () => {
  test("hands back both people", async () => {
    const outcome = await loadPair("p1", async () => json(PAIR));
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.people).toHaveLength(2);
      expect(outcome.result.people[1].name).toBe("Ben");
    }
  });

  test("encodes the id into the upstream path", async () => {
    let url = "";
    await loadPair("a/b", async (input) => {
      url = String(input);
      return json(PAIR);
    });
    expect(url).toBe("https://api.example.test/api/pair/a%2Fb");
  });

  test("an unknown pair is a not-found", async () => {
    const outcome = await loadPair("nope", async () => json({ detail: "unknown pair" }, 404));
    expect(outcome.status).toBe("not_found");
  });

  test("an outage is unavailable", async () => {
    const outcome = await loadPair("p1", async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(outcome.status).toBe("unavailable");
  });

  test("a 200 with the wrong shape is not trusted", async () => {
    const outcome = await loadPair("p1", async () => json({ ...PAIR, people: [PERSON] }));
    expect(outcome.status).toBe("unavailable");
  });

  test("junk in the path never reaches the backend", async () => {
    let called = false;
    const outcome = await loadPair("", async () => {
      called = true;
      return json(PAIR);
    });
    expect(outcome.status).toBe("not_found");
    expect(called).toBe(false);
  });
});

describe("isPairResult", () => {
  test("accepts the real payload", () => {
    expect(isPairResult(PAIR)).toBe(true);
  });

  test("accepts a pair with no shared values", () => {
    // Two people with nothing in their top two is a real, renderable result.
    expect(isPairResult({ ...PAIR, shared_values: [] })).toBe(true);
  });

  test("rejects a payload that is not two people", () => {
    expect(isPairResult(null)).toBe(false);
    expect(isPairResult({ ...PAIR, people: [] })).toBe(false);
    expect(isPairResult({ ...PAIR, people: [PERSON, PERSON, PERSON] })).toBe(false);
    expect(isPairResult({ ...PAIR, people: [PERSON, { name: "Ben" }] })).toBe(false);
  });

  test("rejects a value that lost its copy", () => {
    expect(isPairResult({ ...PAIR, shared_values: [{ key: "BE", name: "Benevolence" }] })).toBe(
      false,
    );
  });
});
