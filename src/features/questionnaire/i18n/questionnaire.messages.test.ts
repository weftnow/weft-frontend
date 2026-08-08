import { expect, test } from "bun:test";
import { questionnaireMessages } from "./questionnaire.messages";

test("English and Spanish expose exactly the same UI keys", () => {
  expect(Object.keys(questionnaireMessages.es).sort()).toEqual(
    Object.keys(questionnaireMessages.en).sort(),
  );
});
