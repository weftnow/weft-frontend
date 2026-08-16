import { describe, expect, test } from "bun:test";
import { fetchFromBackend } from "./dashboard.gateway";

function stubFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("fetchFromBackend", () => {
  test("returns the parsed body on 200", async () => {
    process.env.WEFT_B2B_API_URL = "http://backend";
    const outcome = await fetchFromBackend<{ submitted: number }>(
      "/v1/events/abc/summary",
      "token",
      undefined,
      stubFetch(200, { submitted: 3 }),
    );
    expect(outcome).toEqual({ status: "ok", data: { submitted: 3 } });
  });

  test("maps 402 to planRequired so the UI can offer an upgrade", async () => {
    process.env.WEFT_B2B_API_URL = "http://backend";
    const outcome = await fetchFromBackend(
      "/v1/events/abc/attendees",
      "token",
      undefined,
      stubFetch(402, { code: "plan_required" }),
    );
    expect(outcome).toEqual({ status: "planRequired" });
  });

  test("maps 401 to unauthorized so the page can bounce to login", async () => {
    process.env.WEFT_B2B_API_URL = "http://backend";
    const outcome = await fetchFromBackend(
      "/v1/events",
      "stale",
      undefined,
      stubFetch(401, { detail: "invalid token" }),
    );
    expect(outcome).toEqual({ status: "unauthorized" });
  });
});
