import { expect, test } from "bun:test";
import { decideSubmitOutcome } from "./submitOutcome";

const FALLBACK = "We couldn't save that. Please try again.";

test("a successful response with a token lands on the share phase", () => {
  const outcome = decideSubmitOutcome(true, { share_token: "abc123" }, FALLBACK);
  expect(outcome).toEqual({ phase: "share", token: "abc123" });
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
