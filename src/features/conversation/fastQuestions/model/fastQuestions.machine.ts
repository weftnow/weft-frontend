import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { AdvanceParticipantInput, FastQuestionsSession } from "../types/fastQuestions.types";

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
    return schedule(session, session.roundIndex + 1, 0, startsAt);
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

export function startSessionAt(session: FastQuestionsSession, now: number) {
  return session.status === "waiting" ? schedule(session, 0, 0, now) : session;
}

export function advanceSessionAt(session: FastQuestionsSession, now: number) {
  let current = session;
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
) {
  const current = advanceSessionAt(session, now);
  if (
    current.status !== "active" ||
    current.roundIndex !== expected.roundIndex ||
    current.participantIndex !== expected.participantIndex
  ) return current;
  return step(current, now);
}
