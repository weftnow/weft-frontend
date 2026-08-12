import { expect, setSystemTime, test } from "bun:test";
import { READING_MILLISECONDS } from "@/features/conversation/fastQuestions/model/fastQuestions.machine";
import { POST as START } from "../start/route";
import { POST as ADVANCE } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("validates the event ID before advancing a turn", async () => {
  const response = await ADVANCE(jsonRequest({ roundIndex: 0, participantIndex: 0 }), {
    params: Promise.resolve({ eventId: "bad" }),
  });
  expect(response.status).toBe(400);
});

test("rejects an invalid body", async () => {
  const eventId = "3f9c3d2a-7f1b-4e9a-9d3b-1a2b3c4d5e6f";
  const response = await ADVANCE(jsonRequest({}), {
    params: Promise.resolve({ eventId }),
  });
  expect(response.status).toBe(400);
});

test("advances the participant turn after starting", async () => {
  const eventId = "7a1e2b3c-4d5f-4a6b-8c9d-0e1f2a3b4c5d";
  const context = { params: Promise.resolve({ eventId }) };

  await START(new Request("http://localhost", { method: "POST" }), context);
  // The first participant's reading gap runs from real Date.now() calls
  // inside the store, so the clock has to actually move past it — otherwise
  // this Done tap lands inside the gap and is correctly a no-op.
  setSystemTime(new Date(Date.now() + READING_MILLISECONDS + 1_000));
  try {
    const response = await ADVANCE(jsonRequest({ roundIndex: 0, participantIndex: 0 }), context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.participantIndex).toBe(1);
  } finally {
    setSystemTime();
  }
});
