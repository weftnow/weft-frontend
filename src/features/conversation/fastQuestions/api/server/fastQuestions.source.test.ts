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
