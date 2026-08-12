import {
  mockChallenge,
  mockClosingLine,
} from "../../sharedChallenge/data/mockSharedChallenge";
import { SHARED_CHALLENGE_SECONDS } from "../../sharedChallenge/model/sharedChallenge.timing";
import { sharedChallengeSessionSchema } from "../../sharedChallenge/schemas/sharedChallenge.schema";
import type { SharedChallengeSession } from "../../sharedChallenge/types/sharedChallenge.types";
import type { ConversationSession } from "../../types/conversation.types";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { AdvanceParticipantInput, FastQuestionsSession } from "../types/fastQuestions.types";

// Mirrors READING_SECONDS in the backend's app/icebreaker/timing.py. The mock
// and the backend are two implementations of one state machine; they drift the
// moment they disagree.
export const READING_MILLISECONDS = 8_000;

function schedule(
  session: FastQuestionsSession,
  roundIndex: number,
  participantIndex: number,
  startsAt: number,
): FastQuestionsSession {
  const duration = session.rounds[roundIndex].participantDurationSeconds;
  return fastQuestionsSessionSchema.parse({
    ...session,
    status: "active",
    roundIndex,
    participantIndex,
    timerStartedAt: new Date(startsAt).toISOString(),
    timerEndsAt: new Date(startsAt + duration * 1_000).toISOString(),
  });
}

function step(session: FastQuestionsSession, startsAt: number): FastQuestionsSession {
  if (session.participantIndex + 1 < session.participants.length) {
    return schedule(session, session.roundIndex, session.participantIndex + 1, startsAt);
  }
  if (session.roundIndex + 1 < session.rounds.length) {
    return schedule(
      session,
      session.roundIndex + 1,
      0,
      startsAt + READING_MILLISECONDS,
    );
  }
  return fastQuestionsSessionSchema.parse({
    ...session,
    status: "phase_complete",
    roundIndex: 2,
    participantIndex: session.participants.length - 1,
    timerStartedAt: null,
    timerEndsAt: null,
  });
}

/**
 * Mirrors `begin_phase_two` in the backend's app/icebreaker/state.py: only
 * valid from `phase_complete`, idempotent once the discussion has started, and
 * it leaves the start instant null because there is no individual turn to
 * protect with a reading gap.
 */
export function continueToPhaseTwoAt(
  session: ConversationSession,
  now: number,
): ConversationSession {
  if (session.phaseId === "phase_2") return session;
  if (session.status !== "phase_complete") return session;
  return sharedChallengeSessionSchema.parse({
    eventId: session.eventId,
    phaseId: "phase_2",
    language: session.language,
    status: "active",
    challenge: mockChallenge(session.language),
    timerStartedAt: null,
    timerEndsAt: new Date(now + SHARED_CHALLENGE_SECONDS * 1_000).toISOString(),
    closingLine: null,
  });
}

/** Mirrors the phase-2 branch of the backend's `_step`: expiry ends the session. */
function expireSharedChallengeAt(
  session: SharedChallengeSession,
  now: number,
): SharedChallengeSession {
  if (session.status !== "active" || session.timerEndsAt === null) return session;
  if (now < Date.parse(session.timerEndsAt)) return session;
  return sharedChallengeSessionSchema.parse({
    ...session,
    status: "complete",
    timerStartedAt: null,
    timerEndsAt: null,
    closingLine: mockClosingLine(session.language),
  });
}

// Phase 1 in, phase 1 out: only `continueToPhaseTwoAt` ever changes the phase,
// so callers holding a Fast Questions session keep one across these three.
export function startSessionAt(session: FastQuestionsSession, now: number): FastQuestionsSession;
export function startSessionAt(session: ConversationSession, now: number): ConversationSession;
export function startSessionAt(
  session: ConversationSession,
  now: number,
): ConversationSession {
  if (session.phaseId === "phase_2") return session;
  return session.status === "waiting"
    ? schedule(session, 0, 0, now + READING_MILLISECONDS)
    : session;
}

export function advanceSessionAt(session: FastQuestionsSession, now: number): FastQuestionsSession;
export function advanceSessionAt(session: ConversationSession, now: number): ConversationSession;
export function advanceSessionAt(
  session: ConversationSession,
  now: number,
): ConversationSession {
  if (session.phaseId === "phase_2") return expireSharedChallengeAt(session, now);
  let current: FastQuestionsSession = session;
  const maximum = session.rounds.length * session.participants.length;
  for (let index = 0; index < maximum; index += 1) {
    if (current.status !== "active" || current.timerEndsAt === null) return current;
    const deadline = Date.parse(current.timerEndsAt);
    if (now < deadline) return current;
    current = step(current, deadline);
  }
  return current;
}

export function advanceParticipantAt(
  session: FastQuestionsSession,
  expected: AdvanceParticipantInput,
  now: number,
): FastQuestionsSession;
export function advanceParticipantAt(
  session: ConversationSession,
  expected: AdvanceParticipantInput,
  now: number,
): ConversationSession;
export function advanceParticipantAt(
  session: ConversationSession,
  expected: AdvanceParticipantInput,
  now: number,
): ConversationSession {
  const current = advanceSessionAt(session, now);
  // Phase 2 has no turns, so a Done tap arriving from a stale phone is a no-op.
  if (current.phaseId === "phase_2") return current;
  if (
    current.status !== "active" ||
    current.roundIndex !== expected.roundIndex ||
    current.participantIndex !== expected.participantIndex
  ) return current;
  // Mirrors the backend guard in app/icebreaker/state.py's finish_turn: a tap
  // during the reading gap is a no-op, since the turn it would end has not
  // begun yet.
  if (current.timerStartedAt !== null && now < Date.parse(current.timerStartedAt)) {
    return current;
  }
  return step(current, now);
}
