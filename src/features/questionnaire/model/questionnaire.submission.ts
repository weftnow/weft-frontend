import {
  formSubmissionSchema,
  type FormSubmissionDto,
} from "../schemas/questionnaire.contract.schema";
import type { AnswerValue, Questionnaire } from "../types/questionnaire.types";

export function buildFormSubmission(
  questionnaire: Questionnaire,
  answers: Record<string, AnswerValue>,
): FormSubmissionDto {
  return formSubmissionSchema.parse({
    form_version: questionnaire.version,
    language: questionnaire.language,
    name: answers.name,
    email: answers.email === undefined ? null : answers.email,
    phone: answers.phone === undefined ? null : answers.phone,
    company: answers.company === undefined ? null : answers.company,
    t1: answers.t1,
    t2: answers.t2,
    s1_situation: answers.s1_situation,
    s1_function: answers.s1_function,
    s2: answers.s2,
    s3: answers.s3,
    s4: answers.s4,
    s5: answers.s5,
    s6: answers.s6,
    s7: answers.s7,
    s8: answers.s8,
    s9: answers.s9,
    s10: answers.s10,
  });
}
