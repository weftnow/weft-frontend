import { conversationLanguage } from "../../i18n/conversation.messages";
import type { IcebreakerStateDto } from "../../fastQuestions/schemas/icebreaker.contract.schema";
import type { SharedChallengeSession } from "../types/sharedChallenge.types";

/**
 * Turns a phase-2 icebreaker payload into the session the discussion and
 * closing screens render.
 *
 * The same translation the Fast Questions mapper already does — the backend
 * says `running`, the UI says `active` — so the UI keeps one vocabulary across
 * both phases rather than leaking the backend's into one of them. `finished`
 * becomes `complete` for the same reason.
 */
export function mapSharedChallengeState(
  eventId: string,
  dto: IcebreakerStateDto,
): SharedChallengeSession {
  const complete = dto.status === "finished";
  return {
    eventId,
    phaseId: "phase_2",
    language: conversationLanguage(dto.language),
    status: complete ? "complete" : "active",
    // Null cannot happen — the pool is seeded before the AI is ever called —
    // but an empty string is something the screen can guard, and a crash is
    // not.
    challenge: dto.challenge ?? "",
    // No individual turn to protect, so `begin_phase_two` leaves the start
    // null and clients read that as "already started".
    timerStartedAt: complete ? null : dto.turn_starts_at,
    // The backend leaves the last deadline in place across a transition, and
    // the schema rejects a complete session that still carries one.
    timerEndsAt: complete ? null : dto.turn_ends_at,
    closingLine: dto.closing_line,
  };
}
