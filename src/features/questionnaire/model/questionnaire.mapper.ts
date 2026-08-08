import { messagesFor } from "../i18n/questionnaire.messages";
import type { FormDefinitionDto } from "../schemas/questionnaire.contract.schema";
import { questionnaireSchema } from "../schemas/questionnaire.schema";
import type { Questionnaire } from "../types/questionnaire.types";

export function mapQuestionnaireDefinition(dto: FormDefinitionDto): Questionnaire {
  const copy = messagesFor(dto.language);
  return questionnaireSchema.parse({
    id: "weft-b2b-attendee",
    version: dto.form_version,
    language: dto.language,
    eventName: dto.event_name,
    acceptingSubmissions: dto.accepting_submissions,
    intro: {
      eyebrow: copy.openingEyebrow,
      title: copy.openingTitle,
      subtitle: copy.openingSubtitle,
      welcome: copy.welcome,
    },
    completionMessages: copy.completionMessages,
    questions: dto.questions.map((question) => {
      if (question.type === "short_text" || question.type === "long_text") {
        return {
          id: question.key,
          type: "text" as const,
          message: question.label,
          placeholder: question.placeholder ?? undefined,
          required: question.required,
          multiline: question.type === "long_text",
          inputFormat: question.format,
          maxLength: question.max_length,
        };
      }

      return {
        id: question.key,
        type:
          question.type === "multi_choice"
            ? ("multiple_choice" as const)
            : ("single_choice" as const),
        message: question.label,
        required: question.required,
        options: question.options.map((option) => ({
          id: `${question.key}:${typeof option.value}:${String(option.value)}`,
          label: option.label,
          value: option.value,
        })),
        ...(question.type === "multi_choice"
          ? {
              minSelections: question.min_select ?? (question.required ? 1 : 0),
              maxSelections: question.max_select ?? question.options.length,
            }
          : {}),
      };
    }),
  });
}
