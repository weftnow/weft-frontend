import { expect, test } from "bun:test";
import { avatarToneFor, countdownRemainingMs, initialsFor } from "./groupReveal.model";

test("derives initials and a stable avatar tone", () => {
  expect(initialsFor("Maya Chen")).toBe("MC");
  expect(initialsFor("Prince")).toBe("P");
  expect(initialsFor("  你好 世界 ")).toBe("你世");
  expect(initialsFor("---")).toBe("?");
  expect(avatarToneFor("Maya Chen")).toBe(avatarToneFor("Maya Chen"));
});

test("uses backend time rather than the local clock", () => {
  expect(countdownRemainingMs("2026-08-13T12:00:05+00:00", "2026-08-13T12:00:00+00:00", 1_000, 1_000)).toBe(5_000);
  expect(countdownRemainingMs("2026-08-13T12:00:05+00:00", "2026-08-13T12:00:00+00:00", 1_000, 7_000)).toBe(0);
});
