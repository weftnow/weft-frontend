import { z } from "zod";
import { languageSchema } from "./questionnaire.contract.schema";

const nonEmptyString = z.string().trim().min(1);

export const answerScalarSchema = z.union([z.string(), z.number().int()]);
export const answerValueSchema = z.union([
  answerScalarSchema,
  z.array(answerScalarSchema),
  z.null(),
]);

export const optionSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
  value: answerScalarSchema,
});

const uniqueOptions = (options: z.infer<typeof optionSchema>[]) => {
  const ids = new Set(options.map((option) => option.id));
  const values = new Set(options.map((option) => option.value));
  return ids.size === options.length && values.size === options.length;
};

const textQuestionSchema = z.object({
  id: nonEmptyString,
  type: z.literal("text"),
  message: nonEmptyString,
  placeholder: nonEmptyString.optional(),
  required: z.boolean(),
  multiline: z.boolean(),
  inputFormat: z.enum(["text", "name", "email", "tel", "organization"]),
  maxLength: z.number().int().positive(),
});

const singleChoiceQuestionSchema = z
  .object({
    id: nonEmptyString,
    type: z.literal("single_choice"),
    message: nonEmptyString,
    options: z.array(optionSchema).min(2),
    required: z.boolean().optional(),
  })
  .refine(({ options }) => uniqueOptions(options), {
    message: "Choice option ids and values must be unique",
    path: ["options"],
  });

const multipleChoiceQuestionSchema = z
  .object({
    id: nonEmptyString,
    type: z.literal("multiple_choice"),
    message: nonEmptyString,
    options: z.array(optionSchema).min(2),
    minSelections: z.number().int().nonnegative().optional(),
    maxSelections: z.number().int().positive().optional(),
    required: z.boolean().optional(),
  })
  .superRefine(({ maxSelections, minSelections, options }, context) => {
    if (!uniqueOptions(options)) {
      context.addIssue({
        code: "custom",
        message: "Choice option ids and values must be unique",
        path: ["options"],
      });
    }

    const minimum = minSelections ?? 0;
    const maximum = maxSelections ?? options.length;
    if (minimum > maximum || maximum > options.length) {
      context.addIssue({
        code: "custom",
        message: "Selection limits must fit the available options",
        path: ["maxSelections"],
      });
    }
  });

const hybridQuestionSchema = z
  .object({
    id: nonEmptyString,
    type: z.literal("hybrid"),
    message: nonEmptyString,
    options: z.array(optionSchema).min(1),
    allowOther: z.literal(true),
    required: z.boolean().optional(),
  })
  .refine(({ options }) => uniqueOptions(options), {
    message: "Choice option ids and values must be unique",
    path: ["options"],
  });

export const questionSchema = z.discriminatedUnion("type", [
  textQuestionSchema,
  singleChoiceQuestionSchema,
  multipleChoiceQuestionSchema,
  hybridQuestionSchema,
]);

export const questionnaireSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString,
    language: languageSchema,
    eventName: nonEmptyString,
    acceptingSubmissions: z.boolean(),
    intro: z.object({
      eyebrow: nonEmptyString,
      title: nonEmptyString,
      subtitle: nonEmptyString,
      welcome: nonEmptyString,
    }),
    completionMessages: z.tuple([nonEmptyString, nonEmptyString]),
    questions: z.array(questionSchema).min(1),
  })
  .refine(
    ({ questions }) =>
      new Set(questions.map((question) => question.id)).size === questions.length,
    {
      message: "Question ids must be unique",
      path: ["questions"],
    },
  );

export const submitAnswerInputSchema = z.object({
  questionId: nonEmptyString,
  value: answerValueSchema,
});

export const conversationItemSchema = z.discriminatedUnion("type", [
  z.object({
    id: nonEmptyString,
    type: z.literal("question"),
    questionId: nonEmptyString,
    content: nonEmptyString,
  }),
  z.object({
    id: nonEmptyString,
    type: z.literal("answer"),
    questionId: nonEmptyString,
    value: answerValueSchema,
    display: nonEmptyString,
  }),
]);

export const sessionSchema = z.object({
  questionnaireId: nonEmptyString,
  questionnaireVersion: nonEmptyString,
  conversation: z.array(conversationItemSchema),
  answers: z.record(z.string(), answerValueSchema),
  currentQuestionIndex: z.number().int().nonnegative(),
  completed: z.boolean(),
  updatedAt: z.string().datetime(),
});

export const questionnaireResultSchema = z.object({
  questionnaire: questionnaireSchema,
  session: sessionSchema,
  isNewSession: z.boolean(),
});

type Question = z.infer<typeof questionSchema>;

function parseTextAnswer(value: unknown, required: boolean): string | null {
  if (value === null && !required) return null;

  const parsed = z.string().safeParse(value);
  if (!parsed.success) {
    throw new Error("This answer must be text");
  }

  const trimmed = parsed.data.trim();
  if (required && trimmed.length === 0) {
    throw new Error("An answer is required");
  }

  return trimmed;
}

function parseScalarAnswer(value: unknown) {
  const parsed = answerScalarSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("This answer must be text or a number");
  }
  return parsed.data;
}

export function parseAnswerForQuestion(
  question: Question,
  value: unknown,
): z.infer<typeof answerValueSchema> {
  const required = question.required ?? false;

  if (question.type === "text") {
    return parseTextAnswer(value, required);
  }

  if (question.type === "multiple_choice") {
    const allowed = new Set(question.options.map((option) => option.value));
    const parsed = z.array(answerScalarSchema).safeParse(value);
    if (!parsed.success) {
      throw new Error("Choose one or more listed options");
    }

    const selected = parsed.data;
    if (
      new Set(selected).size !== selected.length ||
      selected.some((selection) => !allowed.has(selection))
    ) {
      throw new Error("Every selection must belong to this question");
    }

    const minimum = question.minSelections ?? (required ? 1 : 0);
    const maximum = question.maxSelections ?? question.options.length;
    if (selected.length < minimum || selected.length > maximum) {
      throw new Error(`Choose between ${minimum} and ${maximum} options`);
    }

    return selected;
  }

  if (question.type === "single_choice") {
    if (value === null && !required) return null;
    const allowed = new Set(question.options.map((option) => option.value));
    const scalar = parseScalarAnswer(value);
    if (!allowed.has(scalar)) {
      throw new Error("Choose one of the listed options");
    }
    return scalar;
  }

  // hybrid
  if (value === null && !required) return null;
  const answer = parseTextAnswer(value, required);
  if (answer !== null && answer.length === 0) {
    throw new Error("Choose an option or tell us your own answer");
  }
  return answer;
}
