import { expect, test } from "bun:test";
import { questionnaireSchema } from "../schemas/questionnaire.schema";
import { mockQuestionnaire } from "./mockQuestionnaire";

test("mock networking questionnaire is valid and exercises all composer types", () => {
  expect(questionnaireSchema.parse(mockQuestionnaire)).toEqual(
    mockQuestionnaire,
  );
  expect(
    new Set(mockQuestionnaire.questions.map((question) => question.type)),
  ).toEqual(new Set(["text", "single_choice", "multiple_choice", "hybrid"]));
  expect(mockQuestionnaire.completionMessages).toEqual([
    "You’re all set.",
    "Thanks. We’ll use your answers to introduce you to the right people.",
  ]);
  expect(mockQuestionnaire.language).toBe("en");
  expect(mockQuestionnaire.eventName).toBe("Weft networking night");
  expect(mockQuestionnaire.acceptingSubmissions).toBe(true);
});
