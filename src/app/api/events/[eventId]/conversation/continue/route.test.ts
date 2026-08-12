import { expect, test } from "bun:test";
import { POST } from "./route";

test("validates the event ID before continuing", async () => {
  const response = await POST(new Request("http://localhost", { method: "POST" }), {
    params: Promise.resolve({ eventId: "bad" }),
  });
  expect(response.status).toBe(400);
});

test("is a no-op on a session that has not finished phase one", async () => {
  // The backend rejects an early Continue and the mock machine mirrors it, so
  // a stray tap returns the session unchanged rather than skipping ahead.
  const eventId = "b1c2d3e4-f506-4718-8a9b-0c1d2e3f4a5b";
  const response = await POST(new Request("http://localhost", { method: "POST" }), {
    params: Promise.resolve({ eventId }),
  });
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.phaseId).toBe("phase_1");
  expect(body.status).toBe("waiting");
});
