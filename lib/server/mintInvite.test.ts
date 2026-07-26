import { beforeEach, describe, expect, test } from "bun:test";
import { mintInvite } from "./mintInvite";

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

describe("mintInvite", () => {
  test("returns the token the backend minted", async () => {
    expect(await mintInvite("sess-1", stub(200, { token: "tok-9" }))).toEqual({
      status: "ok",
      token: "tok-9",
    });
  });

  test("sends the session id in the body and never in the path", async () => {
    // The id is a secret held in an httpOnly cookie. A path segment ends up in
    // access logs and referrers; a POST body does not.
    let seenUrl = "";
    let seenBody = "";
    const spy = (async (url: string, init: RequestInit) => {
      seenUrl = url;
      seenBody = String(init.body);
      return new Response(JSON.stringify({ token: "tok-9" }), { status: 200 });
    }) as unknown as typeof fetch;

    await mintInvite("sess-1", spy);
    expect(seenUrl.endsWith("/api/invite")).toBe(true);
    expect(seenUrl).not.toContain("sess-1");
    expect(JSON.parse(seenBody)).toEqual({ session_id: "sess-1" });
  });

  test("no cookie means there is nothing to mint against", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    expect(await mintInvite(null, spy)).toEqual({ status: "no_session" });
    expect(called).toBe(false);
  });

  test("a session the backend has forgotten maps to not_found", async () => {
    expect(await mintInvite("stale", stub(404, { detail: "unknown session" }))).toEqual({
      status: "not_found",
    });
  });

  test("anything else is unavailable", async () => {
    expect(await mintInvite("sess-1", stub(503, {}))).toEqual({ status: "unavailable" });
    expect(await mintInvite("sess-1", stub(401, {}))).toEqual({ status: "unavailable" });
  });

  test("a 200 with no usable token is unavailable, not a blank link", async () => {
    // Rendering an empty token would produce a share URL ending in a slash,
    // which looks like a link and leads nowhere.
    expect(await mintInvite("sess-1", stub(200, { token: "" }))).toEqual({
      status: "unavailable",
    });
    expect(await mintInvite("sess-1", stub(200, { token: 7 }))).toEqual({
      status: "unavailable",
    });
    expect(await mintInvite("sess-1", stub(200, {}))).toEqual({ status: "unavailable" });
  });
});
