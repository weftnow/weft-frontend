import { conversationLanguage } from "../../i18n/conversation.messages";
import type { IcebreakerStateDto } from "../schemas/icebreaker.contract.schema";
import type { FastQuestionsSession, Participant } from "../types/fastQuestions.types";

/**
 * Turns the backend icebreaker payload into the session the UI renders.
 *
 * Two vocabularies meet here and neither is wrong, so the translation is
 * explicit rather than incidental:
 *
 * - the backend counts rounds from 1 and calls the live state `running`;
 *   the UI counts from 0 and calls it `active`;
 * - the backend models the whole icebreaker (two phases); this mapper handles
 *   phase 1 only, and `mapConversationState` is what decides that.
 */

const MAX_ROUND_INDEX = 2;

/**
 * Only ever called for a phase-1 payload: `mapConversationState` sends phase 2
 * to the shared-challenge mapper before this runs. Collapsing phase 2 here is
 * what used to send a group that reloaded mid-discussion back to the
 * transition screen they had already passed.
 */
function mapStatus(dto: IcebreakerStateDto): FastQuestionsSession["status"] {
  if (dto.status === "running") return "active";
  if (dto.status === "waiting") return "waiting";
  return "phase_complete";
}

function mapParticipants(dto: IcebreakerStateDto): Participant[] {
  return dto.participant_order.map((participant) => ({
    id: participant.attendee_id,
    firstName: participant.name,
    isCurrentUser: participant.attendee_id === dto.viewer.attendee_id,
  }));
}

export function mapIcebreakerState(
  eventId: string,
  dto: IcebreakerStateDto,
): FastQuestionsSession {
  const status = mapStatus(dto);
  const active = status === "active";

  // The UI schema rejects an inactive session that still carries timestamps,
  // and the backend leaves the last deadline in place across a transition.
  const timerEndsAt = active ? dto.turn_ends_at : null;
  // Read rather than derived: with a reading gap the start is later than
  // "end minus duration", and only the server knows where it actually is.
  //
  // Null on a session created before the backend carried this instant. Those
  // sessions must behave exactly as they did before this feature shipped:
  // "end minus duration" sits in the past, so the ring sweeps immediately.
  // Falling back to the end instant instead would put the start in the
  // future for the whole turn and freeze the ring the entire time.
  const duration = dto.participant_duration_seconds;
  const legacyStart =
    timerEndsAt && duration
      ? new Date(Date.parse(timerEndsAt) - duration * 1_000).toISOString()
      : timerEndsAt;
  const timerStartedAt = active ? (dto.turn_starts_at ?? legacyStart) : null;

  return {
    eventId,
    phaseId: "phase_1",
    type: "fast_questions",
    language: conversationLanguage(dto.language),
    status,
    roundIndex: Math.min(Math.max(dto.round - 1, 0), MAX_ROUND_INDEX),
    participantIndex: dto.turn_index,
    timerStartedAt,
    timerEndsAt,
    participants: mapParticipants(dto),
    rounds: dto.rounds.map((round) => ({
      id: round.code,
      question: round.text,
      participantDurationSeconds: round.participant_duration_seconds,
    })),
  };
}
