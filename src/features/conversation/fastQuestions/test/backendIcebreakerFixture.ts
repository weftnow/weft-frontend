/**
 * A payload with exactly the keys weft-b2b-backend serialises, and no others.
 *
 * This file is the counterpart to `IcebreakerStateOut` in the backend's
 * `app/schemas/icebreaker.py`, whose own test (`tests/icebreaker/test_api.py`,
 * `test_every_response_carries_the_full_state`) asserts the same set from the
 * other side.
 *
 * It exists because the gateway tests used to hand-write their own payload.
 * That fixture carried `rounds`, `viewer` and `turn_starts_at` — fields the
 * contract schema required and the backend had never served — so the suite
 * stayed green while every real poll failed to parse and 503'd the room.
 *
 * The rule for editing this file: add a key here only when the backend
 * actually sends it. If a test needs a field the backend does not have, the
 * bug is in the schema, not in this fixture.
 */

export type BackendIcebreakerPayload = Record<string, unknown>;

export const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
export const OTHER_ID = "22222222-2222-4222-8222-222222222222";
export const THIRD_ID = "33333333-3333-4333-8333-333333333333";

export function backendIcebreakerPayload(
  overrides: BackendIcebreakerPayload = {},
): BackendIcebreakerPayload {
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
    current_participant: { attendee_id: VIEWER_ID, name: "Ana" },
    participant_order: [
      { attendee_id: VIEWER_ID, name: "Ana" },
      { attendee_id: OTHER_ID, name: "Bruno" },
      { attendee_id: THIRD_ID, name: "Carla" },
    ],
    viewer: { attendee_id: VIEWER_ID, name: "Ana" },
    turn_index: 0,
    participant_duration_seconds: 30,
    turn_starts_at: "2026-08-09T20:15:00.000Z",
    turn_ends_at: "2026-08-09T20:15:30.000Z",
    closing_line: null,
    ...overrides,
  };
}

/**
 * Every key the backend sends, listed independently of the fixture above so a
 * key silently dropped from one is caught against the other.
 */
export const BACKEND_ICEBREAKER_KEYS = [
  "session_id",
  "status",
  "language",
  "phase",
  "round",
  "total_rounds",
  "question",
  "rounds",
  "challenge",
  "current_participant",
  "participant_order",
  "viewer",
  "turn_index",
  "participant_duration_seconds",
  "turn_starts_at",
  "turn_ends_at",
  "closing_line",
] as const;
