import { expect, test } from "bun:test";
import { decideSubmitOutcome, strandedOutcome } from "./submitOutcome";

const FALLBACK = "We couldn't save that. Please try again.";

test("a successful response with a token lands on the share phase", () => {
  const outcome = decideSubmitOutcome(
    true,
    { share_token: "abc123", return_token: "ret-1" },
    FALLBACK,
  );
  expect(outcome).toEqual({ phase: "share", token: "abc123", returnToken: "ret-1" });
});

test("a share token without a return token still reaches the share phase", () => {
  // Pins the default for a body this function cannot be handed in production:
  // `isAnswersResponse` rejects a response missing `return_token` and the route
  // answers 503, so a share phase with an empty return token is unreachable
  // through the real path. The empty string keeps the affordance suppressed
  // rather than rendering a link to nowhere if a future caller does allow it.
  const outcome = decideSubmitOutcome(true, { share_token: "abc123" }, FALLBACK);
  expect(outcome).toEqual({ phase: "share", token: "abc123", returnToken: "" });
});

test("ok true but no token falls back to the details phase", () => {
  const outcome = decideSubmitOutcome(true, {}, FALLBACK);
  expect(outcome).toEqual({ phase: "details", error: FALLBACK });
});

test("ok true with an empty-string token falls back to the details phase", () => {
  const outcome = decideSubmitOutcome(true, { share_token: "" }, FALLBACK);
  expect(outcome).toEqual({ phase: "details", error: FALLBACK });
});

test("a 4xx with an error field surfaces that message", () => {
  const outcome = decideSubmitOutcome(false, { error: "That email looks wrong." }, FALLBACK);
  expect(outcome).toEqual({ phase: "details", error: "That email looks wrong." });
});

test("a 4xx with no body falls back to the generic error", () => {
  const outcome = decideSubmitOutcome(false, null, FALLBACK);
  expect(outcome).toEqual({ phase: "details", error: FALLBACK });
});

test("a body whose error is an empty string falls back to the generic error", () => {
  const outcome = decideSubmitOutcome(false, { error: "" }, FALLBACK);
  expect(outcome).toEqual({ phase: "details", error: FALLBACK });
});

test("a responder's pair id sends them to the result, not the share screen", () => {
  const outcome = decideSubmitOutcome(
    true,
    { pair_id: "p1", share_token: "tok-2" },
    FALLBACK,
  );
  expect(outcome).toEqual({ phase: "pair", pairId: "p1", shareToken: "tok-2" });
});

test("a pair id without a share token still reaches the result", () => {
  // The result is what they came for; sharing onward is the consolation.
  const outcome = decideSubmitOutcome(true, { pair_id: "p1" }, FALLBACK);
  expect(outcome).toEqual({ phase: "pair", pairId: "p1", shareToken: "" });
});

test("a failed responder submission stays on the details form", () => {
  const outcome = decideSubmitOutcome(
    false,
    { pair_id: "p1", error: "this invite has expired" },
    FALLBACK,
  );
  expect(outcome).toEqual({ phase: "details", error: "this invite has expired" });
});

test("a pair that cannot be navigated to is stranded, not retryable", () => {
  // The POST already succeeded and the pair exists. Offering "try again"
  // would mint a second session and a second pair for the same person.
  expect(strandedOutcome({ phase: "pair", pairId: "p1", shareToken: "tok-9" })).toEqual({
    phase: "stranded",
    pairId: "p1",
    shareToken: "tok-9",
  });
});
