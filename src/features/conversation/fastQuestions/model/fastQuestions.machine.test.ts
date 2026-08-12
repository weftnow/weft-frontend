import { expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import { SHARED_CHALLENGE_SECONDS } from "../../sharedChallenge/model/sharedChallenge.timing";
import {
  advanceParticipantAt,
  advanceSessionAt,
  continueToPhaseTwoAt,
  READING_MILLISECONDS as READING_MS,
  startSessionAt,
} from "./fastQuestions.machine";

const EVENT_ID = "9de77386-a57f-42d6-9581-cf4a75328a87";
const T0 = Date.parse("2026-08-08T20:00:00.000Z");
// READING_MS (imported as READING_MILLISECONDS) mirrors READING_SECONDS in
// the backend's app/icebreaker/timing.py: a session start and each round
// transition (but not an in-round handover) carries this gap, so the
// deadlines below shift by it.

function threeParticipants() {
  const session = createMockFastQuestionsSession(EVENT_ID, { NODE_ENV: "production" });
  return fastQuestionsSessionSchema.parse({
    ...session,
    participants: session.participants.slice(0, 3).map((participant, index) => ({
      ...participant,
      isCurrentUser: index === 2,
    })),
  });
}

test("starts at participant zero with the first duration", () => {
  const started = startSessionAt(threeParticipants(), T0);
  expect(started.status).toBe("active");
  expect(started.participantIndex).toBe(0);
  // First participant's window is the reading gap plus the round's duration.
  expect(started.timerEndsAt).toBe("2026-08-08T20:00:38.000Z");
});

test("chains from deadlines and restarts each round at participant zero", () => {
  // Round 0 (3 x 30s) plus the session-start gap.
  const roundTwo = advanceSessionAt(
    startSessionAt(threeParticipants(), T0),
    T0 + 90_000 + READING_MS,
  );
  expect([roundTwo.roundIndex, roundTwo.participantIndex]).toEqual([1, 0]);
  // Adds the round-two gap on top of the session-start gap already elapsed.
  expect(roundTwo.timerEndsAt).toBe("2026-08-08T20:02:31.000Z");
});

test("catches up after backgrounding and stops before Phase 2", () => {
  // All nine turns (30+45+60 seconds x 3 participants) plus the three gaps:
  // session start and the two round transitions.
  const complete = advanceSessionAt(
    startSessionAt(threeParticipants(), T0),
    T0 + 405_000 + READING_MS * 3,
  );
  expect(complete.status).toBe("phase_complete");
  expect(complete.timerEndsAt).toBeNull();
});

test("ignores stale advances and rebases a valid early advance made after the gap closes", () => {
  const started = startSessionAt(threeParticipants(), T0);
  // Past READING_MS (the gap), so this exercises the stale-mismatch guard
  // rather than the reading-gap guard covered separately below.
  const pastGap = T0 + READING_MS + 1_000;
  expect(advanceParticipantAt(started, { roundIndex: 0, participantIndex: 1 }, pastGap))
    .toEqual(started);
  const valid = advanceParticipantAt(
    started,
    { roundIndex: 0, participantIndex: 0 },
    pastGap,
  );
  expect(valid.participantIndex).toBe(1);
  expect(valid.timerEndsAt).toBe(new Date(pastGap + 30_000).toISOString());
});

test("a Done tap during the reading gap is a no-op", () => {
  // Mirrors the backend guard in app/icebreaker/state.py's finish_turn: the
  // first participant's turn has not begun during the gap, so an eager tap
  // must not consume it.
  const started = startSessionAt(threeParticipants(), T0);
  const duringGap = T0 + READING_MS - 1_000;
  const tapped = advanceParticipantAt(
    started,
    { roundIndex: 0, participantIndex: 0 },
    duringGap,
  );
  expect(tapped).toEqual(started);
});

test("a new round's first participant gets the reading gap", () => {
  const session = threeParticipants();
  const started = startSessionAt(session, T0);
  expect(Date.parse(started.timerStartedAt!) - T0).toBe(READING_MS);

  // Walk to the last participant of round 1, then one more step.
  let current = started;
  for (let i = 0; i < session.participants.length; i += 1) {
    current = advanceParticipantAt(
      current,
      { roundIndex: current.roundIndex, participantIndex: current.participantIndex },
      Date.parse(current.timerEndsAt!),
    );
  }
  expect(current.roundIndex).toBe(1);
  const handover = Date.parse(current.timerStartedAt!);
  const previousEnd = Date.parse(started.timerEndsAt!);
  expect(handover).toBeGreaterThan(previousEnd);
});

function phaseOneComplete() {
  const session = threeParticipants();
  return fastQuestionsSessionSchema.parse({
    ...session,
    status: "phase_complete",
    roundIndex: 2,
    participantIndex: session.participants.length - 1,
    timerStartedAt: null,
    timerEndsAt: null,
  });
}

test("Continue moves a completed phase one into a seven-minute discussion", () => {
  const phaseTwo = continueToPhaseTwoAt(phaseOneComplete(), T0);
  if (phaseTwo.phaseId !== "phase_2") throw new Error("expected a phase two session");
  expect(phaseTwo.status).toBe("active");
  expect(phaseTwo.challenge.length).toBeGreaterThan(0);
  expect(Date.parse(phaseTwo.timerEndsAt ?? "")).toBe(T0 + SHARED_CHALLENGE_SECONDS * 1_000);
  // No individual turn to protect, so there is no reading gap to open.
  expect(phaseTwo.timerStartedAt).toBeNull();
});

test("Continue is a no-op before phase one is complete and after phase two began", () => {
  const waiting = threeParticipants();
  expect(continueToPhaseTwoAt(waiting, T0)).toEqual(waiting);

  const first = continueToPhaseTwoAt(phaseOneComplete(), T0);
  expect(continueToPhaseTwoAt(first, T0 + 5_000)).toEqual(first);
});

test("the discussion expires into a finished session carrying the closing line", () => {
  const phaseTwo = continueToPhaseTwoAt(phaseOneComplete(), T0);

  expect(advanceSessionAt(phaseTwo, T0 + 60_000)).toEqual(phaseTwo);

  const after = advanceSessionAt(phaseTwo, T0 + SHARED_CHALLENGE_SECONDS * 1_000 + 1);
  if (after.phaseId !== "phase_2") throw new Error("expected a phase two session");
  expect(after.status).toBe("complete");
  expect(after.timerEndsAt).toBeNull();
  expect(after.closingLine).toContain("swap contacts");
});

test("phase one controls do nothing once the discussion has started", () => {
  const phaseTwo = continueToPhaseTwoAt(phaseOneComplete(), T0);
  expect(startSessionAt(phaseTwo, T0 + 1_000)).toEqual(phaseTwo);
  expect(advanceParticipantAt(phaseTwo, { roundIndex: 2, participantIndex: 2 }, T0 + 1_000))
    .toEqual(phaseTwo);
});
