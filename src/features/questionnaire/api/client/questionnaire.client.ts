import type { Language } from "../../schemas/questionnaire.contract.schema";
import type { FormSubmissionDto } from "../../schemas/questionnaire.contract.schema";
import { questionnaireSchema } from "../../schemas/questionnaire.schema";
import type { Questionnaire, QuestionnaireClientErrorData } from "../../types/questionnaire.types";

const REQUEST_TIMEOUT_MS = 8_000;

export class QuestionnaireClientError extends Error {
  constructor(readonly data: QuestionnaireClientErrorData) {
    super(data.code);
    this.name = "QuestionnaireClientError";
  }
}

export type QuestionnaireClient = {
  loadLanguage(formToken: string, language: Language): Promise<Questionnaire>;
  submit(formToken: string, submissionId: string, body: FormSubmissionDto): Promise<void>;
};

const KNOWN_CODES = new Set<QuestionnaireClientErrorData["code"]>([
  "invalidLink",
  "notFound",
  "notAccepting",
  "validation",
  "versionConflict",
  "idempotencyConflict",
  "unavailable",
]);

async function readErrorData(response: Response): Promise<QuestionnaireClientErrorData> {
  try {
    const body: unknown = await response.json();
    const code = (body as { code?: unknown } | null)?.code;
    if (typeof code === "string" && KNOWN_CODES.has(code as QuestionnaireClientErrorData["code"])) {
      const field = (body as { field?: unknown }).field;
      return {
        code: code as QuestionnaireClientErrorData["code"],
        field: typeof field === "string" ? field : undefined,
      };
    }
  } catch {
    // Falls through to the generic unavailable error below.
  }
  return { code: "unavailable" };
}

async function loadLanguage(formToken: string, language: Language): Promise<Questionnaire> {
  const response = await fetch(
    `/api/questionnaire/${encodeURIComponent(formToken)}?lang=${encodeURIComponent(language)}`,
    { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
  );
  if (!response.ok) {
    throw new QuestionnaireClientError(await readErrorData(response));
  }
  return questionnaireSchema.parse(await response.json());
}

async function submit(
  formToken: string,
  submissionId: string,
  body: FormSubmissionDto,
): Promise<void> {
  const response = await fetch(`/api/questionnaire/${encodeURIComponent(formToken)}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": submissionId,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new QuestionnaireClientError(await readErrorData(response));
  }

  const parsed: unknown = await response.json();
  if ((parsed as { status?: unknown } | null)?.status !== "completed") {
    throw new QuestionnaireClientError({ code: "unavailable" });
  }
}

export const questionnaireClient: QuestionnaireClient = { loadLanguage, submit };
