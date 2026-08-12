import { mapIcebreakerState } from "../fastQuestions/model/fastQuestions.mapper";
import type { IcebreakerStateDto } from "../fastQuestions/schemas/icebreaker.contract.schema";
import { mapSharedChallengeState } from "../sharedChallenge/model/sharedChallenge.mapper";
import type { ConversationSession } from "../types/conversation.types";

/**
 * The one place a wire payload becomes a phase. Everything above this reads
 * `phaseId` and never `phase`.
 *
 * `finished` only ever follows Phase 2, so the phase number alone is a
 * complete discriminator.
 */
export function mapConversationState(
  eventId: string,
  dto: IcebreakerStateDto,
): ConversationSession {
  if (dto.phase === 2) return mapSharedChallengeState(eventId, dto);
  return mapIcebreakerState(eventId, dto);
}
