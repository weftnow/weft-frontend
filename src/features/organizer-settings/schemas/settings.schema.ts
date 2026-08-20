import { z } from "zod";
import { ORGANIZER_ROLES } from "@/features/organizer-auth/types/organizerAuth.types";

/**
 * The backend's rules, restated in the browser.
 *
 * Duplicated on purpose, the same trade dashboard.schema.ts takes: rejecting
 * here exactly what the server would means a blank name never costs a round
 * trip, and it lets the client treat any rejection that still gets through as
 * our own drift rather than the organizer's mistake.
 */
const trimmedName = z.string().trim().min(1).max(200);

/** Empty box means "no value", not "the empty string". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

export const organizerMeSchema = z.object({
  id: z.string(),
  email: z.string(),
  contact_name: z.string(),
  organization_name: z.string(),
  role: z.string(),
  role_other: z.string().nullable(),
  timezone: z.string(),
  default_language: z.string(),
  whatsapp: z.string().nullable(),
  // Required, not optional. The plan card has nothing to say without it, and a
  // silently-missing plan would render an organizer's billing status as blank
  // rather than failing loudly.
  plan: z.string(),
});

export const settingsUpdateSchema = z
  .object({
    contact_name: trimmedName,
    organization_name: trimmedName,
    role: z.enum(ORGANIZER_ROLES),
    role_other: optionalText(200),
    timezone: z.string().min(1).max(64),
    default_language: z.enum(["en", "es"]),
    whatsapp: optionalText(40),
  })
  // Mirrors the backend's merged-row check. The form always sends every field,
  // so here the body and the resulting row are the same thing.
  .refine((value) => value.role !== "other" || Boolean(value.role_other), {
    path: ["role_other"],
    message: "Tell us what to call your role.",
  });

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1),
  // Field(min_length=8) on the backend.
  new_password: z.string().min(8),
});

export type OrganizerMe = z.infer<typeof organizerMeSchema>;
export type SettingsUpdateBody = z.infer<typeof settingsUpdateSchema>;
export type PasswordChangeBody = z.infer<typeof passwordChangeSchema>;
