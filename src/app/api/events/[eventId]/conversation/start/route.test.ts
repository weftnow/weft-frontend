import { expect, test } from "bun:test";
import { POST } from "./route";

test("validates the event ID before starting a session", async () => {
  const response = await POST(new Request("http://localhost", { method: "POST" }), {
    params: Promise.resolve({ eventId: "bad" }),
  });
  expect(response.status).toBe(400);
});

test("starting twice is idempotent and keeps the same timer", async () => {
  const eventId = "524aa2f5-284a-4ca0-b737-a8847bacfc67";
  const context = { params: Promise.resolve({ eventId }) };

  const first = await POST(new Request("http://localhost", { method: "POST" }), context);
  const second = await POST(new Request("http://localhost", { method: "POST" }), context);

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  const firstBody = await first.json();
  const secondBody = await second.json();
  expect(firstBody.timerEndsAt).not.toBeNull();
  expect(secondBody.timerEndsAt).toBe(firstBody.timerEndsAt);
});
