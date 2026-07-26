import { describe, expect, test } from "bun:test";
import { respondWithMint } from "./route";

describe("respondWithMint", () => {
  test("hands the token back and nothing else", async () => {
    const response = respondWithMint({ status: "ok", token: "tok-9" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token: "tok-9" });
  });

  test("no cookie is 401, because the fix is to take the quiz", async () => {
    const response = respondWithMint({ status: "no_session" });
    expect(response.status).toBe(401);
  });

  test("a forgotten session is 404", async () => {
    expect(respondWithMint({ status: "not_found" }).status).toBe(404);
  });

  test("anything else is 503", async () => {
    expect(respondWithMint({ status: "unavailable" }).status).toBe(503);
  });

  test("no failure body ever carries a session id or an upstream detail", async () => {
    for (const outcome of [
      { status: "no_session" },
      { status: "not_found" },
      { status: "unavailable" },
    ] as const) {
      const body = JSON.stringify(await respondWithMint(outcome).json());
      expect(body).not.toContain("session_id");
      expect(body).not.toContain("weft_core");
    }
  });
});
