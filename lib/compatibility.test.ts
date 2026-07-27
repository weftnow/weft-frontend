import { describe, expect, test } from "bun:test";
import {
  LOADER_CYCLE_MS,
  backFromDetails,
  canAdvance,
  getSelected,
  isSelected,
  nextQuizState,
  prevQuizState,
  progressFraction,
  toggleOption,
} from "./compatibility";

describe("toggleOption", () => {
  test("single select replaces the prior choice", () => {
    const a = toggleOption({}, "q1", "a", "single");
    expect(getSelected(a, "q1")).toEqual(["a"]);
    const b = toggleOption(a, "q1", "b", "single");
    expect(getSelected(b, "q1")).toEqual(["b"]);
  });

  test("single select toggling the same option clears it", () => {
    const a = toggleOption({}, "q1", "a", "single");
    const b = toggleOption(a, "q1", "a", "single");
    expect(getSelected(b, "q1")).toEqual([]);
  });

  test("multi select accumulates and toggles off", () => {
    let a = toggleOption({}, "q2", "x", "multi");
    a = toggleOption(a, "q2", "y", "multi");
    expect(getSelected(a, "q2").sort()).toEqual(["x", "y"]);
    a = toggleOption(a, "q2", "x", "multi");
    expect(getSelected(a, "q2")).toEqual(["y"]);
  });

  test("a limited multi drops the oldest choice rather than refusing a new one", () => {
    // pick2 means exactly two, and the tap that just happened should always win.
    let a = toggleOption({}, "q2", "x", "multi", 2);
    a = toggleOption(a, "q2", "y", "multi", 2);
    a = toggleOption(a, "q2", "z", "multi", 2);
    expect(getSelected(a, "q2")).toEqual(["y", "z"]);
  });

  test("does not mutate the input object", () => {
    const input = {};
    toggleOption(input, "q1", "a", "single");
    expect(input).toEqual({});
  });
});

describe("canAdvance / isSelected", () => {
  test("requires exactly one selection by default", () => {
    expect(canAdvance({}, "q1")).toBe(false);
    expect(canAdvance({ q1: ["a"] }, "q1")).toBe(true);
  });

  test("a pick-two is not answered until both are chosen", () => {
    expect(canAdvance({ q2: ["x"] }, "q2", 2)).toBe(false);
    expect(canAdvance({ q2: ["x", "y"] }, "q2", 2)).toBe(true);
  });

  test("isSelected reflects membership", () => {
    expect(isSelected({ q1: ["a"] }, "q1", "a")).toBe(true);
    expect(isSelected({ q1: ["a"] }, "q1", "b")).toBe(false);
  });
});

describe("quiz navigation", () => {
  test("advancing a middle question moves to the next index", () => {
    expect(nextQuizState(0, 3)).toEqual({ phase: "quiz", activeIndex: 1 });
  });

  test("advancing the last question asks for details", () => {
    expect(nextQuizState(2, 3)).toEqual({ phase: "details", activeIndex: 2 });
  });

  test("going back from a middle question decrements", () => {
    expect(prevQuizState(2)).toEqual({ phase: "quiz", activeIndex: 1 });
  });

  test("going back from the first question returns to intro", () => {
    expect(prevQuizState(0)).toEqual({ phase: "intro", activeIndex: 0 });
  });

  test("backing out of details returns to the last question", () => {
    // Answers live in component state, so nothing is lost on the way back.
    expect(backFromDetails(20)).toEqual({ phase: "quiz", activeIndex: 19 });
  });

  test("backing out of details on an empty quiz cannot go negative", () => {
    expect(backFromDetails(0)).toEqual({ phase: "quiz", activeIndex: 0 });
  });
});

describe("progressFraction", () => {
  test("counts the current question as done", () => {
    expect(progressFraction(0, 4)).toBe(0.25);
    expect(progressFraction(3, 4)).toBe(1);
  });

  test("stays inside 0..1 whatever it is handed", () => {
    expect(progressFraction(9, 4)).toBe(1);
    expect(progressFraction(0, 0)).toBe(0);
  });
});

test("analyzing duration is a positive constant", () => {
  expect(LOADER_CYCLE_MS).toBeGreaterThan(0);
});
