import { expect, test } from "bun:test";
import type { AnswersRequest } from "@/features/demo-b2c/types/contracts";
import { postAnswers } from "./submitAnswers";

test("postAnswers sends the feature payload to the local answers endpoint", async () => {
  let captured: { input: string; init?: RequestInit } | undefined;
  const expectedResponse = new Response("{}", { status: 200 });
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured = { input: String(input), init };
    return expectedResponse;
  }) as typeof fetch;
  const controller = new AbortController();
  const payload: AnswersRequest = {
    name: "Ada",
    email: "ada@example.com",
    phone: "+1 555 0100",
    answers: { q1: 2, q2: [0, 3] },
    invite_token: "invite-1",
  };

  const response = await postAnswers(payload, controller.signal, fetchImpl);

  expect(response).toBe(expectedResponse);
  expect(captured?.input).toBe("/api/answers");
  expect(captured?.init?.method).toBe("POST");
  expect(new Headers(captured?.init?.headers).get("Content-Type")).toBe(
    "application/json",
  );
  expect(captured?.init?.signal).toBe(controller.signal);
  expect(captured?.init?.body).toBe(JSON.stringify(payload));
});
