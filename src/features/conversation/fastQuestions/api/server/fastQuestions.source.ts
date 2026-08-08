import type { MockFastQuestionsStore } from "./mockFastQuestions.store";

export type ConversationSource = "mock";

export type ConversationEnvironment = {
  NODE_ENV?: string;
  WEFT_CONVERSATION_SOURCE?: string;
};

/**
 * Typed error thrown when no usable conversation data source can be
 * resolved for the current environment. Route Handlers (Task 3) catch this
 * specific type — never by matching on `.message` — and map it to
 * `503 {"code":"conversation_not_configured"}`.
 */
export class ConversationSourceError extends Error {
  readonly code = "conversation_not_configured" as const;

  constructor(message: string) {
    super(message);
    this.name = "ConversationSourceError";
  }
}

/**
 * Pure source selector. Development and test environments default to the
 * mock source. Production requires `WEFT_CONVERSATION_SOURCE=mock` to be
 * explicitly configured; any other production configuration is a hard
 * failure rather than a silent fallback to simulated data.
 */
export function conversationSource(environment: ConversationEnvironment): ConversationSource {
  if (environment.NODE_ENV !== "production") return "mock";
  if (environment.WEFT_CONVERSATION_SOURCE === "mock") return "mock";
  if (environment.WEFT_CONVERSATION_SOURCE === undefined) {
    throw new ConversationSourceError("Conversation source is not configured");
  }
  throw new ConversationSourceError(
    `Unsupported conversation source: "${environment.WEFT_CONVERSATION_SOURCE}"`,
  );
}

/**
 * Resolves the repository for the current environment. The repository
 * module is imported dynamically so that loading this module (and calling
 * the pure `conversationSource`) never forces resolution of the
 * `server-only`-guarded repository module — that keeps Bun unit tests free
 * of `server-only` while Route Handlers still get the real boundary.
 */
export async function getFastQuestionsRepository(
  environment: ConversationEnvironment = process.env,
): Promise<MockFastQuestionsStore> {
  const source = conversationSource(environment);
  if (source === "mock") {
    const { mockFastQuestionsRepository } = await import("./mockFastQuestions.repository");
    return mockFastQuestionsRepository;
  }
  throw new ConversationSourceError("Conversation source is not configured");
}
