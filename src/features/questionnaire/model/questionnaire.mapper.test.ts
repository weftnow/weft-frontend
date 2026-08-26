import { expect, test } from "bun:test";
import { formDefinitionSchema } from "../schemas/questionnaire.contract.schema";
import { backendFormEn } from "../test/backendFormFixtures";
import { mapQuestionnaireDefinition } from "./questionnaire.mapper";

test("maps the 17-question backend contract without stringifying numbers", () => {
  const dto = formDefinitionSchema.parse(backendFormEn);
  const questionnaire = mapQuestionnaireDefinition(dto);
  expect(questionnaire.questions).toHaveLength(17);
  const seniority = questionnaire.questions.find((q) => q.id === "s2");
  expect(seniority?.type).toBe("single_choice");
  if (seniority?.type !== "single_choice") throw new Error("s2 was not single choice");
  expect(seniority.options.map((option) => option.value)).toEqual([1, 2, 3, 4, 5]);
  expect(questionnaire.eventName).toBe("Mixer");
  expect(questionnaire.version).toBe("v1");
});

test("carries the event id through, since it addresses every later screen", () => {
  const questionnaire = mapQuestionnaireDefinition(
    formDefinitionSchema.parse(backendFormEn),
  );
  expect(questionnaire.eventId).toBe(backendFormEn.event_id);
});

test("maps backend text semantics into focused UI metadata", () => {
  const questionnaire = mapQuestionnaireDefinition(
    formDefinitionSchema.parse(backendFormEn),
  );
  const email = questionnaire.questions.find((q) => q.id === "email");
  if (email?.type !== "text") throw new Error("email was not a text question");
  expect(email.multiline).toBe(false);
  expect(email.inputFormat).toBe("email");
  expect(email.maxLength).toBe(254);
  expect(email.required).toBe(true);

  const purpose = questionnaire.questions.find((q) => q.id === "t1");
  if (purpose?.type !== "text") throw new Error("t1 was not a text question");
  expect(purpose.multiline).toBe(true);
  expect(purpose.maxLength).toBe(1000);
});
