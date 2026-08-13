import { expect, test } from "bun:test";
import {
  BACKEND_ICEBREAKER_KEYS,
  backendIcebreakerPayload,
} from "../test/backendIcebreakerFixture";
import { icebreakerStateDtoSchema } from "./icebreaker.contract.schema";

/**
 * The guard that was missing. Every other test in this feature builds its own
 * payload, so the schema could — and did — drift into requiring three fields
 * the backend never sent, with nothing failing until a real phone polled.
 */

test("the schema parses a payload with exactly the backend's keys", () => {
  const result = icebreakerStateDtoSchema.safeParse(backendIcebreakerPayload());

  // Report the offending paths rather than a bare `false`: this test failing
  // means a cross-repo contract broke, and the field names are the whole
  // diagnosis.
  const missing = result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
  expect(missing).toEqual([]);
});

test("the schema requires nothing the backend does not send", () => {
  // Dropping each key in turn must fail the parse only because the backend
  // genuinely sends it — never because the schema invented a field. Any key
  // the schema requires but the backend omits shows up in the fixture as a
  // missing key, which the test above catches; this one pins the reverse, that
  // the fixture is not quietly carrying extras nobody asked for.
  const parsed = icebreakerStateDtoSchema.parse(backendIcebreakerPayload());
  expect(Object.keys(parsed).sort()).toEqual([...BACKEND_ICEBREAKER_KEYS].sort());
});

test("a session that has not started yet still parses", () => {
  // `waiting` carries no timestamps and no live turn. The client polls this
  // state before anyone taps Start, so it has to survive the schema.
  const result = icebreakerStateDtoSchema.safeParse(
    backendIcebreakerPayload({
      status: "waiting",
      current_participant: null,
      turn_starts_at: null,
      turn_ends_at: null,
    }),
  );
  expect(result.success).toBe(true);
});

test("a phase-two payload parses without a per-participant duration", () => {
  const result = icebreakerStateDtoSchema.safeParse(
    backendIcebreakerPayload({
      phase: 2,
      question: null,
      challenge: "If you could master one skill overnight, what would it be?",
      current_participant: null,
      participant_duration_seconds: null,
    }),
  );
  expect(result.success).toBe(true);
});

test("a finished session parses with its closing line", () => {
  const result = icebreakerStateDtoSchema.safeParse(
    backendIcebreakerPayload({
      phase: 2,
      status: "finished",
      question: null,
      challenge: "Anything.",
      current_participant: null,
      participant_duration_seconds: null,
      turn_starts_at: null,
      turn_ends_at: null,
      closing_line: "Time!",
    }),
  );
  expect(result.success).toBe(true);
});
