import { describe, expect, test } from "bun:test";
import { optionIndex, toBackendAnswers, unansweredQuestions } from "./answers";
import type { QuizQuestion } from "./compatibilityQuestions";

const QUESTIONS: QuizQuestion[] = [
  {
    id: "Q1",
    prompt: "Single question",
    kind: "single",
    options: [
      { id: "Q1-0", label: "a" },
      { id: "Q1-1", label: "b" },
      { id: "Q1-2", label: "c" },
    ],
  },
  {
    id: "Q9",
    prompt: "Pick two",
    kind: "multi",
    select: 2,
    options: [
      { id: "Q9-0", label: "w" },
      { id: "Q9-1", label: "x" },
      { id: "Q9-2", label: "y" },
    ],
  },
];

describe("optionIndex", () => {
  test("reads the index off the option id", () => {
    expect(optionIndex("Q1-2", "Q1")).toBe(2);
    expect(optionIndex("Q9-0", "Q9")).toBe(0);
  });

  test("rejects an id that does not belong to the question", () => {
    expect(() => optionIndex("Q1-0", "Q9")).toThrow();
  });

  test("rejects a malformed id", () => {
    expect(() => optionIndex("Q1-x", "Q1")).toThrow();
    expect(() => optionIndex("Q1", "Q1")).toThrow();
  });
});

describe("toBackendAnswers", () => {
  test("single questions become a bare index", () => {
    const out = toBackendAnswers({ Q1: ["Q1-2"], Q9: ["Q9-0", "Q9-1"] }, QUESTIONS);
    expect(out.Q1).toBe(2);
  });

  test("pick-two questions become an array of indices", () => {
    const out = toBackendAnswers({ Q1: ["Q1-0"], Q9: ["Q9-0", "Q9-2"] }, QUESTIONS);
    expect(out.Q9).toEqual([0, 2]);
  });

  test("omits questions that were not answered", () => {
    const out = toBackendAnswers({ Q1: ["Q1-0"] }, QUESTIONS);
    expect(out).toEqual({ Q1: 0 });
  });

  test("ignores answers to questions outside the served set", () => {
    // The backend rejects a stray qid outright, so never send one.
    const out = toBackendAnswers({ Q1: ["Q1-0"], Q999: ["Q999-0"] }, QUESTIONS);
    expect(Object.keys(out)).toEqual(["Q1"]);
  });
});

describe("unansweredQuestions", () => {
  test("lists nothing when every question is properly answered", () => {
    expect(
      unansweredQuestions({ Q1: ["Q1-0"], Q9: ["Q9-0", "Q9-1"] }, QUESTIONS),
    ).toEqual([]);
  });

  test("lists a question with no selection", () => {
    expect(unansweredQuestions({ Q9: ["Q9-0", "Q9-1"] }, QUESTIONS)).toEqual(["Q1"]);
  });

  test("a pick-two with one selection is still unanswered", () => {
    expect(unansweredQuestions({ Q1: ["Q1-0"], Q9: ["Q9-0"] }, QUESTIONS)).toEqual(["Q9"]);
  });
});
