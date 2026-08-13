import { expect, test } from "bun:test";
import { assertConversationConfigured, conversationSource } from "./fastQuestions.source";

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

/**
 * The shipped `.env.example` used to carry a bare `WEFT_CONVERSATION_SOURCE=`,
 * so the likeliest real misconfiguration was an empty string rather than an
 * absent one — and it was reported as an unsupported value, sending whoever
 * was debugging to hunt a typo that did not exist.
 */
test("a blank value is unset, not an unsupported choice", () => {
  for (const blank of ["", "   ", "\t"]) {
    expect(conversationSource({ NODE_ENV: "test", WEFT_CONVERSATION_SOURCE: blank })).toBe("mock");
    expect(() =>
      conversationSource({ NODE_ENV: "production", WEFT_CONVERSATION_SOURCE: blank }),
    ).toThrow("Conversation source is not configured");
  }
});

test("surrounding space and capitals survive a paste into a hosting dashboard", () => {
  const NODE_ENV = "production";
  expect(conversationSource({ NODE_ENV, WEFT_CONVERSATION_SOURCE: " mock " })).toBe("mock");
  expect(conversationSource({ NODE_ENV, WEFT_CONVERSATION_SOURCE: "Mock" })).toBe("mock");
  expect(conversationSource({ NODE_ENV, WEFT_CONVERSATION_SOURCE: "BACKEND\n" })).toBe("backend");
});

test("an unsupported value still names the value that was actually set", () => {
  expect(() =>
    conversationSource({ NODE_ENV: "production", WEFT_CONVERSATION_SOURCE: "Backends" }),
  ).toThrow('Unsupported conversation source: "Backends"');
});

/**
 * What the boot check has to catch. Choosing the backend without a URL to reach
 * is exactly as broken as choosing nothing, and used to fail just as late.
 */
test("the startup check rejects a backend choice with nowhere to send it", () => {
  expect(() =>
    assertConversationConfigured({
      NODE_ENV: "production",
      WEFT_CONVERSATION_SOURCE: "backend",
    }),
  ).toThrow("WEFT_B2B_API_URL is not configured");

  expect(() =>
    assertConversationConfigured({
      NODE_ENV: "production",
      WEFT_CONVERSATION_SOURCE: "backend",
      WEFT_B2B_API_URL: "   ",
    }),
  ).toThrow("WEFT_B2B_API_URL is not configured");
});

test("the startup check passes on a complete configuration", () => {
  expect(() =>
    assertConversationConfigured({
      NODE_ENV: "production",
      WEFT_CONVERSATION_SOURCE: "backend",
      WEFT_B2B_API_URL: "https://b2b.example.test",
    }),
  ).not.toThrow();

  // Mock needs no URL, and development needs no configuration at all.
  expect(() =>
    assertConversationConfigured({ NODE_ENV: "production", WEFT_CONVERSATION_SOURCE: "mock" }),
  ).not.toThrow();
  expect(() => assertConversationConfigured({ NODE_ENV: "development" })).not.toThrow();
});

test("the startup check refuses an unconfigured production", () => {
  expect(() => assertConversationConfigured({ NODE_ENV: "production" })).toThrow(
    "Conversation source is not configured",
  );
});

test("an explicit backend choice wins in every environment", () => {
  // Development has to be able to point at a locally running backend, so the
  // explicit setting outranks the non-production default rather than being
  // ignored outside production.
  for (const NODE_ENV of ["development", "test", "production"]) {
    expect(conversationSource({ NODE_ENV, WEFT_CONVERSATION_SOURCE: "backend" })).toBe("backend");
  }
});
