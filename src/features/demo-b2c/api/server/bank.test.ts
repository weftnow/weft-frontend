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

  test("concurrent callers during a slow fetch share one upstream call", async () => {
    let calls = 0;
    let resolveFetch: (value: Response) => void = () => {};
    const fetchImpl = async () => {
      calls += 1;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    };

    const p1 = loadBank({ fetchImpl });
    const p2 = loadBank({ fetchImpl });
    resolveFetch(ok(LIVE));
    const [res1, res2] = await Promise.all([p1, p2]);

    expect(calls).toBe(1);
    expect(res1).toEqual(res2);
    expect(res1.source).toBe("live");
  });

  test("a later call refetches once a failed in-flight fetch has settled", async () => {
    let calls = 0;
    const failing = async () => {
      calls += 1;
      throw new Error("down");
    };
    await loadBank({ fetchImpl: failing });
    await loadBank({ fetchImpl: failing });
    expect(calls).toBe(2);
  });

  test("a reset during an in-flight fetch means a caller after the reset does not receive the pre-reset bank", async () => {
    let resolveStale: (value: Response) => void = () => {};
    const staleFetchImpl = async () =>
      new Promise<Response>((resolve) => {
        resolveStale = resolve;
      });

    // Kick off a fetch that will not settle until after the reset below.
    const stalePromise = loadBank({ fetchImpl: staleFetchImpl });

    resetBankCache();

    const FRESH = {
      questions: [
        { id: "Q1", prompt: "fresh prompt", kind: "single", seg: 1, options: ["a", "b"] },
      ],
      question_set: ["Q1"],
    };
    const freshResult = await loadBank({ fetchImpl: async () => ok(FRESH) });
    expect(freshResult.bank.questions[0].prompt).toBe("fresh prompt");

    // Now let the pre-reset fetch land. It must not overwrite the memo that
    // the post-reset caller already relied on.
    resolveStale(ok(LIVE));
    await stalePromise;

    const afterStaleSettles = await loadBank({ fetchImpl: async () => ok(FRESH) });
    expect(afterStaleSettles.bank.questions[0].prompt).toBe("fresh prompt");
  });
});
