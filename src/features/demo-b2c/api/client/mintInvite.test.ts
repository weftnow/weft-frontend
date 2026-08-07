import { expect, test } from "bun:test";
import { postInvite } from "./mintInvite";

test("postInvite requests a fresh invite from the local endpoint", async () => {
  let captured: { input: string; init?: RequestInit } | undefined;
  const expectedResponse = new Response("{}", { status: 200 });
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured = { input: String(input), init };
    return expectedResponse;
  }) as typeof fetch;
  const controller = new AbortController();

  const response = await postInvite(controller.signal, fetchImpl);

  expect(response).toBe(expectedResponse);
  expect(captured?.input).toBe("/api/invite");
  expect(captured?.init?.method).toBe("POST");
  expect(captured?.init?.signal).toBe(controller.signal);
});
