export function postInvite(
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  return fetchImpl("/api/invite", { method: "POST", signal });
}
