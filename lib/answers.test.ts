import { describe, expect, test } from "bun:test";
import { firstUnansweredIndex, optionIndex, toBackendAnswers, unansweredQuestions } from "./answers";
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

describe("firstUnansweredIndex", () => {
  const THREE: QuizQuestion[] = [
    {
      id: "A",
      prompt: "First",
      kind: "single",
      options: [
        { id: "A-0", label: "a" },
        { id: "A-1", label: "b" },
      ],
    },
    {
      id: "B",
      prompt: "Middle",
      kind: "single",
      options: [
        { id: "B-0", label: "a" },
        { id: "B-1", label: "b" },
      ],
    },
    {
      id: "C",
      prompt: "Last, pick two",
      kind: "multi",
      select: 2,
      options: [
        { id: "C-0", label: "a" },
        { id: "C-1", label: "b" },
        { id: "C-2", label: "c" },
      ],
    },
  ];

  test("returns -1 when everything is answered", () => {
    expect(
      firstUnansweredIndex({ A: ["A-0"], B: ["B-0"], C: ["C-0", "C-1"] }, THREE),
    ).toBe(-1);
  });

  test("finds a gap at the first question", () => {
    expect(firstUnansweredIndex({ B: ["B-0"], C: ["C-0", "C-1"] }, THREE)).toBe(0);
  });

  test("finds a gap in the middle question", () => {
    expect(firstUnansweredIndex({ A: ["A-0"], C: ["C-0", "C-1"] }, THREE)).toBe(1);
  });

  test("finds a gap at the last question", () => {
    expect(firstUnansweredIndex({ A: ["A-0"], B: ["B-0"] }, THREE)).toBe(2);
  });

  test("with multiple gaps, returns the first one", () => {
    expect(firstUnansweredIndex({ B: ["B-0"] }, THREE)).toBe(0);
  });

  test("a pick-two holding only one selection counts as a gap", () => {
    expect(firstUnansweredIndex({ A: ["A-0"], B: ["B-0"], C: ["C-0"] }, THREE)).toBe(2);
  });
});
