import { expect, test } from "bun:test";
import { GET } from "./route";

test("validates the event ID before reading a session", async () => {
  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ eventId: "bad" }),
  });
  expect(response.status).toBe(400);
});

test("returns a complete waiting session", async () => {
  const eventId = "f96564ea-6390-4523-8d73-a4a99b92f3c4";
  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ eventId }),
  });
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.eventId).toBe(eventId);
  expect(body.rounds).toHaveLength(3);
});

test("maps a source-configuration failure to a stable 503 instead of mock state", async () => {
  const eventId = "c9f316b1-021f-4085-8bda-e2d1ee9dab77";
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSource = process.env.WEFT_CONVERSATION_SOURCE;
  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    Reflect.set(process.env, "WEFT_CONVERSATION_SOURCE", "other");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ eventId }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "conversation_not_configured" });
  } finally {
    if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
    if (originalSource === undefined)
      Reflect.deleteProperty(process.env, "WEFT_CONVERSATION_SOURCE");
    else Reflect.set(process.env, "WEFT_CONVERSATION_SOURCE", originalSource);
  }
});
