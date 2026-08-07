import { describe, expect, test } from "bun:test";
import {
  FALLBACK_BANK,
  isBankResponse,
  toQuizQuestions,
} from "./compatibilityQuestions";
import { toBackendAnswers } from "./answers";
import type { BankQuestion } from "./weftTypes";

const BANK: BankQuestion[] = [
  { id: "Q1", prompt: "One of these", kind: "single", seg: 1, options: ["a", "b", "c"] },
  { id: "W2", prompt: "Two of these", kind: "pick2", seg: 3, options: ["w", "x", "y", "z"] },
];

describe("toQuizQuestions", () => {
  test("a single question keeps its prompt and needs one choice", () => {
    const [q] = toQuizQuestions(BANK);
    expect(q.id).toBe("Q1");
    expect(q.prompt).toBe("One of these");
    expect(q.kind).toBe("single");
    expect(q.select).toBeUndefined();
  });

  test("a pick2 question becomes a multi that takes exactly two", () => {
    const q = toQuizQuestions(BANK)[1];
    expect(q.kind).toBe("multi");
    expect(q.select).toBe(2);
  });

  test("options gain positional ids the backend can read back", () => {
    const [q] = toQuizQuestions(BANK);
    expect(q.options).toEqual([
      { id: "Q1-0", label: "a" },
      { id: "Q1-1", label: "b" },
      { id: "Q1-2", label: "c" },
    ]);
  });

  test("a selection round-trips back to the index the backend expects", () => {
    const questions = toQuizQuestions(BANK);
    const picked = { Q1: [questions[0].options[2].id], W2: [questions[1].options[0].id, questions[1].options[3].id] };
    expect(toBackendAnswers(picked, questions)).toEqual({ Q1: 2, W2: [0, 3] });
  });
});

describe("isBankResponse", () => {
  test("accepts the real payload", () => {
    expect(isBankResponse(FALLBACK_BANK)).toBe(true);
  });

  test("rejects anything that would not render", () => {
    expect(isBankResponse(null)).toBe(false);
    expect(isBankResponse({ questions: [] })).toBe(false);
    expect(isBankResponse({ questions: [{ id: "Q1" }], question_set: ["Q1"] })).toBe(false);
  });
});

describe("the bundled fallback", () => {
  test("carries the whole served quiz", () => {
    expect(FALLBACK_BANK.questions).toHaveLength(20);
    expect(FALLBACK_BANK.question_set).toHaveLength(20);
  });

  test("every question is renderable and uniquely identified", () => {
    const ids = new Set<string>();
    for (const q of FALLBACK_BANK.questions) {
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.options.length).toBeGreaterThan(1);
      expect(q.options.every((o) => o.length > 0)).toBe(true);
      ids.add(q.id);
    }
    expect(ids.size).toBe(20);
  });
});
