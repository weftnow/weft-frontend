import { expect, test } from "bun:test";
import type { IcebreakerStateDto } from "../fastQuestions/schemas/icebreaker.contract.schema";
import { conversationSessionSchema } from "../schemas/conversation.schema";
import { mapConversationState } from "./conversation.mapper";

const EVENT_ID = "8f14e45f-ea0c-4d6b-9f1c-2b3a4c5d6e7f";
const VIEWER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const THIRD = "33333333-3333-4333-8333-333333333333";

function dto(overrides: Partial<IcebreakerStateDto> = {}): IcebreakerStateDto {
  return {
    session_id: "44444444-4444-4444-8444-444444444444",
    status: "running",
    language: "en",
    phase: 1,
    round: 1,
    total_rounds: 3,
    question: { code: "Q001", text: "One" },
    rounds: [
      { code: "Q001", text: "One", participant_duration_seconds: 30 },
      { code: "Q031", text: "Two", participant_duration_seconds: 45 },
      { code: "Q066", text: "Three", participant_duration_seconds: 60 },
    ],
    challenge: null,
    current_participant: { attendee_id: VIEWER, name: "Ana" },
    participant_order: [
      { attendee_id: VIEWER, name: "Ana" },
      { attendee_id: OTHER, name: "Bruno" },
      { attendee_id: THIRD, name: "Carla" },
    ],
    viewer: { attendee_id: VIEWER, name: "Ana" },
    turn_index: 0,
    participant_duration_seconds: 30,
    turn_starts_at: "2026-08-09T20:15:00.000Z",
    turn_ends_at: "2026-08-09T20:15:30.000Z",
    closing_line: null,
    ...overrides,
  };
}

const phaseTwo = {
  phase: 2,
  question: null,
  challenge: "What would you change about how people find work?",
  current_participant: null,
  participant_duration_seconds: null,
  turn_starts_at: null,
  turn_ends_at: "2026-08-09T20:22:00.000Z",
} satisfies Partial<IcebreakerStateDto>;

test("routes a phase-one payload to the fast questions shape", () => {
  const session = mapConversationState(EVENT_ID, dto());
  expect(session.phaseId).toBe("phase_1");
  expect(() => conversationSessionSchema.parse(session)).not.toThrow();
});

test("routes a phase-two payload to the shared challenge shape", () => {
  const session = mapConversationState(EVENT_ID, dto(phaseTwo));
  expect(session.phaseId).toBe("phase_2");
  expect(() => conversationSessionSchema.parse(session)).not.toThrow();
});

test("routes a finished session to the shared challenge complete shape", () => {
  const session = mapConversationState(
    EVENT_ID,
    dto({
      ...phaseTwo,
      status: "finished",
      turn_ends_at: null,
      closing_line: "Time! Before you split — swap contacts with anyone you want to see again.",
    }),
  );
  if (session.phaseId !== "phase_2") throw new Error("expected a phase two session");
  expect(session.status).toBe("complete");
  expect(() => conversationSessionSchema.parse(session)).not.toThrow();
});

test("no longer collapses a running phase two into the end of phase one", () => {
  // The defect this whole switch exists to prevent: collapsing here is what
  // sent a group that reloaded mid-discussion back to the transition screen.
  const session = mapConversationState(EVENT_ID, dto(phaseTwo));
  expect(session.status).not.toBe("phase_complete");
});
