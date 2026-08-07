import type { AnswersRequest } from "@/features/demo-b2c/types/contracts";

export function postAnswers(
  payload: AnswersRequest,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  return fetchImpl("/api/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(payload),
  });
}
