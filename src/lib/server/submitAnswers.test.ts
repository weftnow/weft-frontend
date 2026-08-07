import { beforeEach, describe, expect, test } from "bun:test";
import { parseAnswersBody, submitAnswers } from "./submitAnswers";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  name: "Ada",
  email: "ada@example.com",
  phone: "+1 415 555 0100",
  answers: { Q1: 2, W2: [0, 3] },
};

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
});

describe("parseAnswersBody", () => {
  test("accepts a complete originator submission", () => {
    expect(parseAnswersBody(VALID)).toEqual(VALID);
  });

  test("accepts an invite token when one is present", () => {
    const withToken = { ...VALID, invite_token: "abc" };
    expect(parseAnswersBody(withToken)?.invite_token).toBe("abc");
  });

  test("rejects anything that is not a submission", () => {
    expect(parseAnswersBody(null)).toBeNull();
    expect(parseAnswersBody("hello")).toBeNull();
    expect(parseAnswersBody({ ...VALID, name: 42 })).toBeNull();
    expect(parseAnswersBody({ ...VALID, answers: [] })).toBeNull();
    expect(parseAnswersBody({ ...VALID, answers: {} })).toBeNull();
    expect(parseAnswersBody({ ...VALID, answers: { Q1: "two" } })).toBeNull();
    expect(parseAnswersBody({ ...VALID, invite_token: 7 })).toBeNull();
  });
});

describe("submitAnswers", () => {
  test("hands back the share token and keeps the session id for the cookie", async () => {
    const out = await submitAnswers(VALID, async () =>
      json({ role: "originator", session_id: "sess-1", share_token: "tok-1" }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.sessionId).toBe("sess-1");
      expect(out.body).toEqual({ role: "originator", share_token: "tok-1" });
      // The session id is the identity itself -- it belongs in an httpOnly
      // cookie and nowhere JS can read it.
      expect(JSON.stringify(out.body)).not.toContain("sess-1");
    }
  });

  test("passes a responder's pair id through", async () => {
    const out = await submitAnswers({ ...VALID, invite_token: "abc" }, async () =>
      json({ role: "responder", session_id: "s2", share_token: "t2", pair_id: "p2" }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.body.pair_id).toBe("p2");
  });

  test("posts the submission upstream as JSON", async () => {
    let method = "";
    let sent: unknown = null;
    await submitAnswers(VALID, async (_input, init) => {
      method = String(init?.method);
      sent = JSON.parse(String(init?.body));
      return json({ role: "originator", session_id: "s", share_token: "t" });
    });
    expect(method).toBe("POST");
    expect(sent).toEqual(VALID);
  });

  test("refuses a malformed body without calling the backend", async () => {
    let called = false;
    const out = await submitAnswers({ name: "Ada" }, async () => {
      called = true;
      return json({});
    });
    expect(called).toBe(false);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(400);
  });

  test("surfaces the backend's own validation wording", async () => {
    const out = await submitAnswers(VALID, async () =>
      json({ detail: "Q9 needs exactly 2 choices, got 1" }, 400),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(400);
      expect(out.body.error).toBe("Q9 needs exactly 2 choices, got 1");
    }
  });

  test("an expired invite stays a 410", async () => {
    const out = await submitAnswers({ ...VALID, invite_token: "old" }, async () =>
      json({ detail: "this invite has expired" }, 410),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(410);
  });

  test("a rejected proxy key is our problem, reported as a 502", async () => {
    const out = await submitAnswers(VALID, async () => json({ detail: "nope" }, 401));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(502);
  });

  test("an upstream crash becomes a 503 with nothing internal in it", async () => {
    const out = await submitAnswers(VALID, async () =>
      json({ detail: "psycopg2 OperationalError at 10.0.0.4:5432" }, 500),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(503);
      expect(out.body.error).not.toContain("psycopg2");
    }
  });

  test("a backend that answers 200 with the wrong shape is not trusted", async () => {
    const out = await submitAnswers(VALID, async () => json({ role: "originator" }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(503);
  });
});
