import {
  advanceParticipantInputSchema,
  eventIdSchema,
  fastQuestionsSessionSchema,
} from "../schemas/fastQuestions.schema";
import type { AdvanceParticipantInput, FastQuestionsApi, FastQuestionsSession } from "../types/fastQuestions.types";

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

async function requestSession(path: string, init?: RequestInit): Promise<FastQuestionsSession> {
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

  return fastQuestionsSessionSchema.parse(await response.json());
}

export const fastQuestionsApi: FastQuestionsApi = {
  async getConversationSession(eventId) {
    const id = eventIdSchema.parse(eventId);
    return requestSession("/api/events/" + id + "/conversation");
  },
  async startFastQuestionsPhase(eventId) {
    const id = eventIdSchema.parse(eventId);
    return requestSession("/api/events/" + id + "/conversation/start", { method: "POST" });
  },
  async advanceParticipantTurn(eventId, expected: AdvanceParticipantInput) {
    const id = eventIdSchema.parse(eventId);
    const body = advanceParticipantInputSchema.parse(expected);
    return requestSession("/api/events/" + id + "/conversation/advance", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
