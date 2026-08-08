import { expect, test } from "bun:test";
import { formDefinitionSchema } from "../schemas/questionnaire.contract.schema";
import { backendFormEn } from "../test/backendFormFixtures";
import { mapQuestionnaireDefinition } from "./questionnaire.mapper";
import { buildFormSubmission } from "./questionnaire.submission";

const questionnaireEn = mapQuestionnaireDefinition(formDefinitionSchema.parse(backendFormEn));

test("builds the flat FastAPI body and preserves numeric choices", () => {
  const body = buildFormSubmission(questionnaireEn, {
    name: "Ana",
    email: null,
    phone: "+57 300 000 0000",
    company: null,
    t1: "Raise a seed round",
    t2: "A LatAm fintech angel",
    s1_situation: "own_business",
    s1_function: "engineering_product",
    s2: 3,
    s3: "up",
    s4: ["raise_capital"],
    s5: [],
    s6: 2,
    s7: 2,
    s8: 1,
    s9: 3,
    s10: 3,
  });
  expect(body.form_version).toBe("v1");
  expect(body.language).toBe("en");
  expect(body.s2).toBe(3);
  expect(body.email).toBeNull();
});

test("rejects an incomplete answer set", () => {
  expect(() => buildFormSubmission(questionnaireEn, { name: "Ana" })).toThrow();
});
