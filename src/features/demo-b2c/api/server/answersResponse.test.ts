import { expect, test } from "bun:test";
import { respondToSubmission } from "./answersResponse";
import type { SubmitOutcome } from "./submitAnswers";

test("a success sets the session cookie once and never leaks the session id", async () => {
  const outcome: SubmitOutcome = {
    ok: true,
    sessionId: "sess-123",
    body: { role: "originator", share_token: "tok-abc", return_token: "ret-abc" },
  };
  const calls: string[] = [];
  const setCookie = async (sessionId: string) => {
    calls.push(sessionId);
  };

  const response = await respondToSubmission(outcome, setCookie);

  expect(calls).toEqual(["sess-123"]);
  expect(response.status).toBe(200);
  const body = (await response.json()) as Record<string, unknown>;
  expect(body.share_token).toBe("tok-abc");
  expect("session_id" in body).toBe(false);
});

test("a failure returns the mapped status and never sets a cookie", async () => {
  const outcome: SubmitOutcome = {
    ok: false,
    status: 400,
    body: { error: "That submission was incomplete. Please try again.", code: "validation" },
  };
  const setCookie = async () => {
    throw new Error("setCookie should not be called on failure");
  };

  const response = await respondToSubmission(outcome, setCookie);

  expect(response.status).toBe(400);
  const body = (await response.json()) as Record<string, unknown>;
  expect(body.error).toBe("That submission was incomplete. Please try again.");
});
