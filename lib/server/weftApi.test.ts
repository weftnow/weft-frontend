import { beforeEach, describe, expect, test } from "bun:test";
import { mapUpstreamStatus, weftFetch } from "./weftApi";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
  delete process.env.WEFT_PROXY_KEY;
});

describe("mapUpstreamStatus", () => {
  test("maps the statuses the backend actually returns", () => {
    expect(mapUpstreamStatus(400)).toBe("validation");
    expect(mapUpstreamStatus(404)).toBe("not_found");
    expect(mapUpstreamStatus(410)).toBe("expired");
    expect(mapUpstreamStatus(401)).toBe("unauthorized");
    expect(mapUpstreamStatus(403)).toBe("unauthorized");
  });

  test("anything else is a service problem, not a user problem", () => {
    expect(mapUpstreamStatus(500)).toBe("unavailable");
    expect(mapUpstreamStatus(502)).toBe("unavailable");
    expect(mapUpstreamStatus(418)).toBe("unavailable");
  });
});

describe("weftFetch", () => {
  test("returns parsed data on success", async () => {
    const res = await weftFetch<{ hello: string }>("/api/bank", undefined, async () =>
      jsonResponse({ hello: "world" }),
    );
    expect(res).toEqual({ ok: true, data: { hello: "world" } });
  });

  test("calls the configured base url with the given path", async () => {
    let seen = "";
    await weftFetch("/api/bank", undefined, async (input) => {
      seen = String(input);
      return jsonResponse({});
    });
    expect(seen).toBe("https://api.example.test/api/bank");
  });

  test("sends the proxy key when one is configured", async () => {
    process.env.WEFT_PROXY_KEY = "s3cret";
    let key: string | null = null;
    await weftFetch("/api/bank", undefined, async (_input, init) => {
      key = new Headers(init?.headers).get("X-Weft-Proxy-Key");
      return jsonResponse({});
    });
    expect(key).toBe("s3cret");
  });

  test("omits the proxy key header when unset", async () => {
    let has = true;
    await weftFetch("/api/bank", undefined, async (_input, init) => {
      has = new Headers(init?.headers).has("X-Weft-Proxy-Key");
      return jsonResponse({});
    });
    expect(has).toBe(false);
  });

  test("maps an upstream error status to a code", async () => {
    const res = await weftFetch("/api/pair/nope", undefined, async () =>
      jsonResponse({ detail: "unknown pair" }, 404),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(404);
      expect(res.code).toBe("not_found");
    }
  });

  test("passes the backend's validation message through", async () => {
    // A 400 is the user's problem and its wording is written for them.
    const res = await weftFetch("/api/answers", undefined, async () =>
      jsonResponse({ detail: "missing answers for: Q1" }, 400),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe("missing answers for: Q1");
  });

  test("never leaks an upstream server error body", async () => {
    const res = await weftFetch("/api/bank", undefined, async () =>
      jsonResponse({ detail: "psycopg2 OperationalError at 10.0.0.4:5432" }, 500),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).not.toContain("psycopg2");
      expect(res.message).not.toContain("10.0.0.4");
    }
  });

  test("a network failure becomes unavailable, not a throw", async () => {
    const res = await weftFetch("/api/bank", undefined, async () => {
      throw new Error("ECONNREFUSED 127.0.0.1:8000");
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("unavailable");
      expect(res.message).not.toContain("ECONNREFUSED");
    }
  });

  test("a missing base url is a configuration error, surfaced as unavailable", async () => {
    delete process.env.WEFT_API_URL;
    const res = await weftFetch("/api/bank", undefined, async () => jsonResponse({}));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("unavailable");
  });
});
