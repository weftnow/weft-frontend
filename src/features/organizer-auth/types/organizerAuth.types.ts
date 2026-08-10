export const ORGANIZER_LANGUAGES = ["en", "es"] as const;
export type OrganizerLanguage = (typeof ORGANIZER_LANGUAGES)[number];

export const ORGANIZER_ROLES = [
  "founder",
  "community_manager",
  "event_manager",
  "operations",
  "marketing_lead",
  "other",
] as const;
export type OrganizerRole = (typeof ORGANIZER_ROLES)[number];

export const REGISTER_STEPS = [
  "contact_name",
  "organization_name",
  "role",
  "email",
  "password",
] as const;
export type RegisterStep = (typeof REGISTER_STEPS)[number];

export const ORGANIZER_AUTH_FIELDS = [
  ...REGISTER_STEPS,
  "timezone",
  "default_language",
] as const;
export type OrganizerAuthField = (typeof ORGANIZER_AUTH_FIELDS)[number];

export type RegistrationDraft = {
  contactName: string;
  organizationName: string;
  role: OrganizerRole | null;
  email: string;
  password: string;
};

export type RegisterRequestDto = {
  contact_name: string;
  organization_name: string;
  role: OrganizerRole;
  email: string;
  password: string;
  timezone: string;
  default_language: OrganizerLanguage;
};

export type LoginRequestDto = { email: string; password: string };

export type OrganizerAuthFailureData =
  | { code: "validation"; field?: OrganizerAuthField }
  | { code: "emailAlreadyRegistered" }
  | { code: "invalidCredentials" }
  | { code: "unavailable" };
