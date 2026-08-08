import { expect, test } from "bun:test";
import {
  parseAnswerForQuestion,
  questionnaireSchema,
  sessionSchema,
} from "./questionnaire.schema";

const options = [
  { id: "a", label: "Founders", value: "founders" },
  { id: "b", label: "Operators", value: "operators" },
  { id: "c", label: "Investors", value: "investors" },
];

test("questionnaire schema accepts every supported question kind", () => {
  const result = questionnaireSchema.safeParse({
    id: "networking-night",
    version: "1",
    language: "en",
    eventName: "Weft networking night",
    acceptingSubmissions: true,
    intro: {
      eyebrow: "Weft questionnaire",
      title: "Let's get to know you",
      subtitle: "This helps us find your people in the room.",
      welcome: "Hi, I'm Weft. I'll ask a few quick questions.",
    },
    completionMessages: [
      "You’re all set.",
      "Thanks. We’ll use your answers to introduce you to the right people.",
    ],
    questions: [
      {
        id: "text",
        type: "text",
        message: "What are you building?",
        required: true,
        multiline: false,
        inputFormat: "text",
        maxLength: 200,
      },
      {
        id: "single",
        type: "single_choice",
        message: "Why are you here?",
        options,
      },
      {
        id: "multiple",
        type: "multiple_choice",
        message: "Pick two",
        options,
        minSelections: 1,
        maxSelections: 2,
      },
      {
        id: "hybrid",
        type: "hybrid",
        message: "Who should you meet?",
        options,
        allowOther: true,
      },
    ],
  });

  expect(result.success).toBe(true);
});

test("questionnaire schema rejects duplicate option ids and invalid selection bounds", () => {
  const duplicate = questionnaireSchema.safeParse({
    id: "broken",
    version: "1",
    language: "en",
    eventName: "Weft networking night",
    acceptingSubmissions: true,
    intro: { eyebrow: "Q", title: "T", subtitle: "S", welcome: "W" },
    completionMessages: ["One", "Two"],
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        message: "Pick",
        options: [options[0], options[0]],
        minSelections: 2,
        maxSelections: 1,
      },
    ],
  });

  expect(duplicate.success).toBe(false);
});

test("answer parsing validates membership, trimming, and selection limits", () => {
  const multipleQuestion = {
    id: "topics",
    type: "multiple_choice" as const,
    message: "Which topics?",
    options,
    minSelections: 1,
    maxSelections: 2,
  };

  expect(
    parseAnswerForQuestion(multipleQuestion, ["founders", "operators"]),
  ).toEqual(["founders", "operators"]);
  expect(() => parseAnswerForQuestion(multipleQuestion, ["missing"])).toThrow();
  expect(() => parseAnswerForQuestion(multipleQuestion, [])).toThrow();
  expect(() =>
    parseAnswerForQuestion(
      {
        id: "work",
        type: "text",
        message: "Work?",
        required: true,
        multiline: false,
        inputFormat: "text",
        maxLength: 200,
      },
      "   ",
    ),
  ).toThrow();
});

test("numeric single-choice answers are preserved without stringification", () => {
  const seniorityQuestion = {
    id: "seniority",
    type: "single_choice" as const,
    message: "How long?",
    required: true,
    options: [
      { id: "seniority:1", label: "Under 2 years", value: 1 },
      { id: "seniority:2", label: "2-5 years", value: 2 },
    ],
  };

  expect(parseAnswerForQuestion(seniorityQuestion, 2)).toBe(2);
  expect(() => parseAnswerForQuestion(seniorityQuestion, "2")).toThrow();
});

test("optional questions accept the explicit null Skip sentinel", () => {
  const optionalQuestion = {
    id: "email",
    type: "text" as const,
    message: "Email?",
    required: false,
    multiline: false,
    inputFormat: "email" as const,
    maxLength: 254,
  };

  expect(parseAnswerForQuestion(optionalQuestion, null)).toBeNull();
  expect(() =>
    parseAnswerForQuestion(
      { ...optionalQuestion, required: true },
      null,
    ),
  ).toThrow();
});

test("hybrid questions accept a listed value or a meaningful Other answer", () => {
  const hybridQuestion = {
    id: "people",
    type: "hybrid" as const,
    message: "Who should you meet?",
    options,
    allowOther: true as const,
  };

  expect(parseAnswerForQuestion(hybridQuestion, "founders")).toBe("founders");
  expect(parseAnswerForQuestion(hybridQuestion, "  Climate policy leaders  ")).toBe(
    "Climate policy leaders",
  );
  expect(() => parseAnswerForQuestion(hybridQuestion, "   ")).toThrow();
});

test("session schema rejects malformed persisted conversation", () => {
  expect(
    sessionSchema.safeParse({ questionnaireId: "x", questionnaireVersion: "1" })
      .success,
  ).toBe(false);
});
