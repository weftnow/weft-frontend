import { expect, test } from "bun:test";
import { conversationSource } from "./fastQuestions.source";

test("defaults to mock only outside production", () => {
  expect(conversationSource({ NODE_ENV: "test" })).toBe("mock");
  expect(() => conversationSource({ NODE_ENV: "production" })).toThrow(
    "Conversation source is not configured",
  );
});

test("allows explicit production mock and rejects unknown values", () => {
  expect(conversationSource({
    NODE_ENV: "production",
    WEFT_CONVERSATION_SOURCE: "mock",
  })).toBe("mock");
  expect(() => conversationSource({
    NODE_ENV: "production",
    WEFT_CONVERSATION_SOURCE: "other",
  })).toThrow("Unsupported conversation source");
});

test("an explicit backend choice wins in every environment", () => {
  // Development has to be able to point at a locally running backend, so the
  // explicit setting outranks the non-production default rather than being
  // ignored outside production.
  for (const NODE_ENV of ["development", "test", "production"]) {
    expect(conversationSource({ NODE_ENV, WEFT_CONVERSATION_SOURCE: "backend" })).toBe("backend");
  }
});
