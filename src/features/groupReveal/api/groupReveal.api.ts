import { groupRevealSchema, type GroupReveal } from "../schemas/groupReveal.schema";
export interface GroupRevealClient { load(formToken: string): Promise<{ status: "waiting" } | { status: "ready"; group: GroupReveal }>; confirm(formToken: string): Promise<void>; }

export type GroupRevealLoadErrorKind = "no_session" | "unavailable";

export class GroupRevealLoadError extends Error {
  constructor(readonly kind: GroupRevealLoadErrorKind) {
    super(kind);
    this.name = "GroupRevealLoadError";
  }
}

async function readLoadErrorKind(response: Response): Promise<GroupRevealLoadErrorKind> {
  if (response.status !== 401) return "unavailable";

  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "code" in body && body.code === "no_session") {
      return "no_session";
    }
  } catch {
    // A malformed failure body is unavailable, regardless of status.
  }

  return "unavailable";
}

export const groupRevealClient: GroupRevealClient = {
  async load(formToken) {
    try {
      const r = await fetch(`/api/questionnaire/${encodeURIComponent(formToken)}/group`, { signal: AbortSignal.timeout(8_000) });
      if (r.status === 204) return { status: "waiting" };
      if (!r.ok) throw new GroupRevealLoadError(await readLoadErrorKind(r));
      return { status: "ready", group: groupRevealSchema.parse(await r.json()) };
    } catch (error) {
      if (error instanceof GroupRevealLoadError) throw error;
      throw new GroupRevealLoadError("unavailable");
    }
  },
  async confirm(formToken) {
    const r = await fetch(`/api/questionnaire/${encodeURIComponent(formToken)}/group/confirm`, { method: "POST", signal: AbortSignal.timeout(8_000) });
    if (!r.ok) throw new Error("confirmation unavailable");
  },
};
