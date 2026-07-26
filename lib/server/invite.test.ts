import { beforeEach, describe, expect, test } from "bun:test";
import { isInviteResponse, loadInvite } from "./invite";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const INVITE = {
  from_name: "Ana",
  question_set: ["Q1"],
  questions: [
    { id: "Q1", prompt: "One of these", kind: "single", seg: 1, options: ["a", "b"] },
  ],
};

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
});

describe("loadInvite", () => {
  test("hands back an invite the friend can render", async () => {
    const outcome = await loadInvite("tok", async () => json(INVITE));
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.invite.from_name).toBe("Ana");
      expect(outcome.invite.questions).toHaveLength(1);
    }
  });

  test("asks the backend for the token it was given", async () => {
    let url = "";
    await loadInvite("a b/c", async (input) => {
      url = String(input);
      return json(INVITE);
    });
    // A token is data, not URL syntax.
    expect(url).toBe("https://api.example.test/api/invite/a%20b%2Fc");
  });

  test("an expired invite is its own outcome, not a not-found", async () => {
    const outcome = await loadInvite("old", async () =>
      json({ detail: "this invite has expired" }, 410),
    );
    expect(outcome.status).toBe("expired");
  });

  test("an unknown token is a not-found", async () => {
    const outcome = await loadInvite("nope", async () =>
      json({ detail: "unknown invite" }, 404),
    );
    expect(outcome.status).toBe("not_found");
  });

  test("a backend having a moment is unavailable, not not-found", async () => {
    const outcome = await loadInvite("tok", async () => json({ detail: "boom" }, 500));
    expect(outcome.status).toBe("unavailable");
  });

  test("a rejected proxy key reads as unavailable -- it is our problem", async () => {
    const outcome = await loadInvite("tok", async () => json({ detail: "nope" }, 401));
    expect(outcome.status).toBe("unavailable");
  });

  test("a 200 that would not render is not trusted", async () => {
    const outcome = await loadInvite("tok", async () =>
      json({ from_name: "Ana", question_set: ["Q1"], questions: [] }),
    );
    expect(outcome.status).toBe("unavailable");
  });

  test("junk in the path never reaches the backend", async () => {
    let called = false;
    const spy = async () => {
      called = true;
      return json(INVITE);
    };
    expect((await loadInvite("", spy)).status).toBe("not_found");
    expect((await loadInvite("x".repeat(200), spy)).status).toBe("not_found");
    expect(called).toBe(false);
  });
});

describe("isInviteResponse", () => {
  test("accepts the real payload", () => {
    expect(isInviteResponse(INVITE)).toBe(true);
  });

  test("rejects anything the quiz could not render", () => {
    expect(isInviteResponse(null)).toBe(false);
    expect(isInviteResponse({ ...INVITE, from_name: 7 })).toBe(false);
    expect(isInviteResponse({ ...INVITE, question_set: [] })).toBe(false);
    expect(isInviteResponse({ ...INVITE, questions: [{ id: "Q1" }] })).toBe(false);
    // A question with one option is a question with no choice in it.
    expect(
      isInviteResponse({
        ...INVITE,
        questions: [{ id: "Q1", prompt: "p", kind: "single", seg: 1, options: ["only"] }],
      }),
    ).toBe(false);
  });
});
