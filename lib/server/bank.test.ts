import { beforeEach, describe, expect, test } from "bun:test";
import { loadBank, resetBankCache } from "./bank";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const LIVE = {
  questions: [
    { id: "Q1", prompt: "live prompt", kind: "single", seg: 1, options: ["a", "b"] },
  ],
  question_set: ["Q1"],
};

beforeEach(() => {
  resetBankCache();
  process.env.WEFT_API_URL = "https://api.example.test";
});

describe("loadBank", () => {
  test("returns the upstream bank when the backend answers", async () => {
    const res = await loadBank({ fetchImpl: async () => ok(LIVE) });
    expect(res.source).toBe("live");
    expect(res.bank.questions[0].prompt).toBe("live prompt");
  });

  test("falls back to the bundled snapshot when the backend is down", async () => {
    const res = await loadBank({
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    expect(res.source).toBe("fallback");
    expect(res.bank.questions).toHaveLength(20);
  });

  test("falls back when the backend answers 200 with nonsense", async () => {
    const res = await loadBank({ fetchImpl: async () => ok({ questions: "soon" }) });
    expect(res.source).toBe("fallback");
    expect(res.bank.questions).toHaveLength(20);
  });

  test("serves a second caller from memory inside the hour", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return ok(LIVE);
    };
    await loadBank({ fetchImpl, now: () => 0 });
    const res = await loadBank({ fetchImpl, now: () => 60 * 60 * 1000 - 1 });
    expect(calls).toBe(1);
    expect(res.source).toBe("live");
  });

  test("refetches once the hour is up", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return ok(LIVE);
    };
    await loadBank({ fetchImpl, now: () => 0 });
    await loadBank({ fetchImpl, now: () => 60 * 60 * 1000 });
    expect(calls).toBe(2);
  });

  test("never caches an outage", async () => {
    let calls = 0;
    const failing = async () => {
      calls += 1;
      throw new Error("down");
    };
    await loadBank({ fetchImpl: failing, now: () => 0 });
    await loadBank({ fetchImpl: failing, now: () => 1 });
    expect(calls).toBe(2);
  });
});
