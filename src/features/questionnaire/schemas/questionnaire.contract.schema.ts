import { z } from "zod";

export const languageSchema = z.enum(["en", "es"]);
export const formTokenSchema = z
  .string()
  .min(16)
  .max(512)
  .regex(/^[A-Za-z0-9._-]+$/);
export const optionValueSchema = z.union([z.string(), z.number().int()]);

const optionSchema = z.object({ value: optionValueSchema, label: z.string().min(1) });
const textBase = z.object({
  key: z.string().min(1),
  required: z.boolean(),
  label: z.string().min(1),
  placeholder: z.string().min(1).nullable().optional(),
  format: z.enum(["text", "name", "email", "tel", "organization"]),
  max_length: z.number().int().positive(),
});

export const backendQuestionSchema = z.discriminatedUnion("type", [
  textBase.extend({ type: z.literal("short_text") }),
  textBase.extend({ type: z.literal("long_text") }),
  z.object({
    key: z.string().min(1),
    type: z.literal("single_choice"),
    required: z.boolean(),
    label: z.string().min(1),
    options: z.array(optionSchema).min(2),
  }),
  z.object({
    key: z.string().min(1),
    type: z.literal("multi_choice"),
    required: z.boolean(),
    label: z.string().min(1),
    options: z.array(optionSchema).min(1),
    min_select: z.number().int().nonnegative().nullable().optional(),
    max_select: z.number().int().positive().nullable().optional(),
  }),
]);

export const formDefinitionSchema = z.object({
  form_version: z.string().min(1),
  language: languageSchema,
  event_name: z.string().min(1),
  accepting_submissions: z.boolean(),
  questions: z.array(backendQuestionSchema).length(17),
});

const situationSchema = z.enum(["company", "own_business", "independent", "exploring"]);
const functionSchema = z.enum([
  "engineering_product",
  "sales_bd",
  "marketing_growth",
  "ops_finance",
  "design",
  "investing",
  "exploring",
]);
const askChipSchema = z.enum([
  "raise_capital",
  "find_customers",
  "find_provider",
  "find_partners",
  "hire_talent",
  "find_job",
  "find_cofounder",
  "meet_peers",
]);
const offerChipSchema = z.enum([
  "experience",
  "intros",
  "distribution",
  "capital",
  "mentorship",
  "hiring",
  "technical_help",
]);

export const formSubmissionSchema = z.object({
  form_version: z.string().min(1),
  language: languageSchema,
  name: z.string().trim().min(1).max(200),
  email: z.string().email().max(254).nullable(),
  phone: z.string().trim().max(32).nullable(),
  company: z.string().trim().max(200).nullable(),
  t1: z.string().trim().min(1).max(1_000),
  t2: z.string().trim().min(1).max(1_000),
  s1_situation: situationSchema,
  s1_function: functionSchema,
  s2: z.number().int().min(1).max(5),
  s3: z.enum(["up", "peer", "down"]),
  s4: z.array(askChipSchema).min(1),
  s5: z.array(offerChipSchema),
  s6: z.number().int().min(1).max(4),
  s7: z.number().int().min(1).max(4),
  s8: z.number().int().min(1).max(4),
  s9: z.number().int().min(1).max(3),
  s10: z.number().int().min(1).max(3),
});

export type Language = z.infer<typeof languageSchema>;
export type BackendQuestion = z.infer<typeof backendQuestionSchema>;
export type FormDefinitionDto = z.infer<typeof formDefinitionSchema>;
export type FormSubmissionDto = z.infer<typeof formSubmissionSchema>;
