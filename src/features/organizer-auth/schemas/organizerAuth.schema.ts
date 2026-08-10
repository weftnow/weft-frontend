import { z } from "zod";
import {
  ORGANIZER_AUTH_FIELDS,
  ORGANIZER_LANGUAGES,
  ORGANIZER_ROLES,
  type LoginRequestDto,
  type OrganizerAuthField,
  type OrganizerLanguage,
  type RegisterRequestDto,
  type RegisterStep,
  type RegistrationDraft,
} from "../types/organizerAuth.types";

const trimmedName = z.string().trim().min(1).max(200);
const email = z.string().trim().email().max(320);
const role = z.enum(ORGANIZER_ROLES);
const language = z.enum(ORGANIZER_LANGUAGES);
const timezone = z.string().trim().min(1).max(64).refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
});

export const organizerAuthFieldSchema = z.enum(ORGANIZER_AUTH_FIELDS);

export const registrationRequestSchema = z.object({
  contact_name: trimmedName,
  organization_name: trimmedName,
  role,
  email,
  password: z.string().min(8),
  timezone,
  default_language: language,
}).strict();

export const loginRequestSchema = z.object({
  email,
  password: z.string().min(1),
}).strict();

const stepSchemas = {
  contact_name: trimmedName,
  organization_name: trimmedName,
  role,
  email,
  password: z.string().min(8),
} as const;

function stepValue(step: RegisterStep, draft: RegistrationDraft): unknown {
  if (step === "contact_name") return draft.contactName;
  if (step === "organization_name") return draft.organizationName;
  if (step === "role") return draft.role;
  return draft[step];
}

export function validateRegistrationStep(
  step: RegisterStep,
  draft: RegistrationDraft,
): RegisterStep | undefined {
  const result = stepSchemas[step].safeParse(stepValue(step, draft));
  return result.success ? undefined : step;
}

export function toRegisterRequest(
  draft: RegistrationDraft,
  selectedLanguage: OrganizerLanguage,
  timezone: string,
): RegisterRequestDto {
  return registrationRequestSchema.parse({
    contact_name: draft.contactName,
    organization_name: draft.organizationName,
    role: draft.role,
    email: draft.email,
    password: draft.password,
    timezone,
    default_language: selectedLanguage,
  });
}

export function toLoginRequest(emailValue: string, password: string): LoginRequestDto {
  return loginRequestSchema.parse({ email: emailValue, password });
}

export function resolveBrowserTimezone(
  readTimezone: () => string = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  try {
    const parsed = timezone.safeParse(readTimezone());
    return parsed.success ? parsed.data : "UTC";
  } catch {
    return "UTC";
  }
}

export function isOrganizerAuthField(value: unknown): value is OrganizerAuthField {
  return organizerAuthFieldSchema.safeParse(value).success;
}
