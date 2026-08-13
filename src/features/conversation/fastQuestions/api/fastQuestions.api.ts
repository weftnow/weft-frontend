import { conversationSessionSchema } from "../../schemas/conversation.schema";
import type { ConversationApi, ConversationSession } from "../../types/conversation.types";
import {
  advanceParticipantInputSchema,
  eventIdSchema,
} from "../schemas/fastQuestions.schema";
import type { AdvanceParticipantInput } from "../types/fastQuestions.types";
import { formTokenSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";

const TIMEOUT_MS = 8_000;

export class FastQuestionsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(`Fast questions request failed with status ${status} (${code})`);
    this.name = "FastQuestionsApiError";
    this.status = status;
    this.code = code;
  }
}

async function requestSession(path: string, init?: RequestInit): Promise<ConversationSession> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = typeof (body as { code?: unknown })?.code === "string"
      ? (body as { code: string }).code
      : "unknown";
    throw new FastQuestionsApiError(response.status, code);
  }

  return conversationSessionSchema.parse(await response.json());
}

export function createConversationApi(
  basePath: (sessionKey: string) => string,
  validateSessionKey: (sessionKey: string) => string = eventIdSchema.parse,
): ConversationApi {
  return {
  async getConversationSession(sessionKey) {
    const id = validateSessionKey(sessionKey);
    return requestSession(basePath(id));
  },
  async startFastQuestionsPhase(sessionKey) {
    const id = validateSessionKey(sessionKey);
    return requestSession(basePath(id) + "/start", { method: "POST" });
  },
  async advanceParticipantTurn(sessionKey, expected: AdvanceParticipantInput) {
    const id = validateSessionKey(sessionKey);
    const body = advanceParticipantInputSchema.parse(expected);
    return requestSession(basePath(id) + "/advance", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  async continueToPhaseTwo(sessionKey) {
    const id = validateSessionKey(sessionKey);
    return requestSession(basePath(id) + "/continue", { method: "POST" });
  },
  };
}

export const conversationApi = createConversationApi((eventId) => `/api/events/${encodeURIComponent(eventId)}/conversation`);
export const formTokenConversationApi = createConversationApi(
  (formToken) => `/api/questionnaire/${encodeURIComponent(formToken)}/conversation`,
  formTokenSchema.parse,
);
