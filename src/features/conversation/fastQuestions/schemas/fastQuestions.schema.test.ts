import { expect, test } from "bun:test";
import { eventIdSchema, fastQuestionsSessionSchema } from "./fastQuestions.schema";

const valid = {
  eventId: "6d0c6a42-4d67-4f92-bf75-4c93056dca73",
  phaseId: "phase_1",
  type: "fast_questions",
  language: "en",
  status: "active",
  roundIndex: 0,
  participantIndex: 0,
  timerStartedAt: "2026-08-08T20:00:00.000Z",
  timerEndsAt: "2026-08-08T20:00:30.000Z",
  participants: [
    { id: "p1", firstName: "Antonio", avatarUrl: "/a.png", isCurrentUser: false },
    { id: "p2", firstName: "You", avatarUrl: "/b.png", isCurrentUser: true },
    { id: "p3", firstName: "María", avatarUrl: "/c.png", isCurrentUser: false },
  ],
  rounds: [
    { id: "round_1", question: "One?", participantDurationSeconds: 30 },
    { id: "round_2", question: "Two?", participantDurationSeconds: 45 },
    { id: "round_3", question: "Three?", participantDurationSeconds: 60 },
  ],
} as const;

test("accepts one complete three-round session", () => {
  expect(fastQuestionsSessionSchema.parse(valid).rounds).toHaveLength(3);
  expect(eventIdSchema.parse(valid.eventId)).toBe(valid.eventId);
});

test("rejects anything other than exactly three rounds", () => {
  expect(() =>
    fastQuestionsSessionSchema.parse({ ...valid, rounds: valid.rounds.slice(0, 2) }),
  ).toThrow();
});

test("rejects multiple current users and out-of-range participant indices", () => {
  expect(() =>
    fastQuestionsSessionSchema.parse({
      ...valid,
      participantIndex: 3,
      participants: valid.participants.map((participant) => ({
        ...participant,
        isCurrentUser: true,
      })),
    }),
  ).toThrow();
});

test("requires active timestamps and clears them at completion", () => {
  expect(() => fastQuestionsSessionSchema.parse({ ...valid, timerEndsAt: null })).toThrow();
  expect(
    fastQuestionsSessionSchema.parse({
      ...valid,
      status: "phase_complete",
      roundIndex: 2,
      participantIndex: 2,
      timerStartedAt: null,
      timerEndsAt: null,
    }).status,
  ).toBe("phase_complete");
});
