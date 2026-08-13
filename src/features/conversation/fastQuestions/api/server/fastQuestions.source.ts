import type { MockFastQuestionsStore } from "./mockFastQuestions.store";

/**
 * `backend` talks to weft-b2b-backend; `mock` keeps development and tests
 * free of a running backend. Both satisfy the same store shape, so nothing
 * above this seam knows which one it is talking to.
 */
export type ConversationSource = "mock" | "backend";

export type ConversationEnvironment = {
  NODE_ENV?: string;
  WEFT_CONVERSATION_SOURCE?: string;
  WEFT_B2B_API_URL?: string;
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
 *
 * The value is trimmed and lowercased, and an empty string counts as unset:
 * a hosting dashboard field left blank, and a `.env` line with nothing after
 * the `=`, are both "nobody chose" rather than "somebody chose ''". Reporting
 * those as an unsupported value would send whoever is debugging looking for a
 * typo that does not exist.
 */
export function conversationSource(environment: ConversationEnvironment): ConversationSource {
  const configured = environment.WEFT_CONVERSATION_SOURCE?.trim().toLowerCase();

  // An explicit choice always wins, in any environment — that is what lets a
  // developer point at a locally running backend.
  if (configured === "backend") return "backend";
  if (configured === "mock") return "mock";
  if (configured === undefined || configured === "") {
    if (environment.NODE_ENV !== "production") return "mock";
    throw new ConversationSourceError("Conversation source is not configured");
  }
  throw new ConversationSourceError(
    `Unsupported conversation source: "${environment.WEFT_CONVERSATION_SOURCE}"`,
  );
}

/**
 * The whole configuration, checked in one go so a bad deploy can fail at boot
 * instead of at the first guest's request. `conversationSource` alone is not
 * the whole story: choosing `backend` without a `WEFT_B2B_API_URL` to reach is
 * just as broken, and fails just as late.
 *
 * Called from `src/instrumentation.ts`. Kept pure and separately exported so
 * it is testable without a running server.
 */
export function assertConversationConfigured(
  environment: ConversationEnvironment = process.env,
): void {
  if (conversationSource(environment) === "backend" && !environment.WEFT_B2B_API_URL?.trim()) {
    throw new ConversationSourceError(
      "WEFT_CONVERSATION_SOURCE is \"backend\" but WEFT_B2B_API_URL is not configured",
    );
  }
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
  if (source === "backend") {
    const { backendFastQuestionsRepository } = await import("./backendFastQuestions.repository");
    return backendFastQuestionsRepository;
  }
  throw new ConversationSourceError("Conversation source is not configured");
}
