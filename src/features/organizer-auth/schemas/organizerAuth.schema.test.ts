import { expect, test } from "bun:test";
import {
  loginRequestSchema,
  registrationRequestSchema,
  resolveBrowserTimezone,
  toRegisterRequest,
  validateRegistrationStep,
  validateRoleStep,
} from "./organizerAuth.schema";
import { ORGANIZER_ROLES } from "../types/organizerAuth.types";

const draft = {
  contactName: "  Ana Restrepo  ",
  organizationName: "  Weft Events  ",
  role: "event_manager" as const,
  roleOther: "",
  email: "ana@example.com",
  password: "longenough",
};

test("registration accepts every canonical role and rejects unknown roles", () => {
  for (const role of ORGANIZER_ROLES) {
    expect(
      registrationRequestSchema.safeParse({
        contact_name: "Ana",
        organization_name: "Weft",
        role,
        role_other: role === "other" ? "Volunteer coordinator" : null,
        email: "ana@example.com",
        password: "longenough",
        timezone: "America/Bogota",
        default_language: "en",
      }).success,
    ).toBe(true);
  }
  expect(
    registrationRequestSchema.safeParse({
      contact_name: "Ana",
      organization_name: "Weft",
      role: "chief_vibes_officer",
      role_other: null,
      email: "ana@example.com",
      password: "longenough",
      timezone: "UTC",
      default_language: "en",
    }).success,
  ).toBe(false);
});

test("DTO mapping trims names, includes language and timezone, and omits WhatsApp", () => {
  const payload = toRegisterRequest(draft, "es", "America/Bogota");
  expect(payload).toEqual({
    contact_name: "Ana Restrepo",
    organization_name: "Weft Events",
    role: "event_manager",
    role_other: null,
    email: "ana@example.com",
    password: "longenough",
    timezone: "America/Bogota",
    default_language: "es",
  });
  expect("whatsapp" in payload).toBe(false);
});

test("selecting Other with a filled roleOther passes validation and maps the trimmed text", () => {
  const otherDraft = { ...draft, role: "other" as const, roleOther: "  Volunteer coordinator  " };
  expect(validateRoleStep(otherDraft)).toBeUndefined();
  const payload = toRegisterRequest(otherDraft, "en", "UTC");
  expect(payload.role).toBe("other");
  expect(payload.role_other).toBe("Volunteer coordinator");
});

test("selecting Other with a blank roleOther fails the role-step validator", () => {
  expect(validateRoleStep({ ...draft, role: "other", roleOther: "" })).toBe("roleOther");
  expect(validateRoleStep({ ...draft, role: "other", roleOther: "   " })).toBe("roleOther");
});

test("the request schema rejects role \"other\" with a null role_other", () => {
  expect(
    registrationRequestSchema.safeParse({
      contact_name: "Ana",
      organization_name: "Weft",
      role: "other",
      role_other: null,
      email: "ana@example.com",
      password: "longenough",
      timezone: "UTC",
      default_language: "en",
    }).success,
  ).toBe(false);
});

test("the request schema rejects a non-null role_other when role is not \"other\"", () => {
  expect(
    registrationRequestSchema.safeParse({
      contact_name: "Ana",
      organization_name: "Weft",
      role: "founder",
      role_other: "Volunteer coordinator",
      email: "ana@example.com",
      password: "longenough",
      timezone: "UTC",
      default_language: "en",
    }).success,
  ).toBe(false);
});

test("step validation rejects blanks, invalid email, and short passwords", () => {
  expect(validateRegistrationStep("contact_name", { ...draft, contactName: "   " })).toBeDefined();
  expect(validateRegistrationStep("organization_name", { ...draft, organizationName: "" })).toBeDefined();
  expect(validateRoleStep({ ...draft, role: null })).toBe("role");
  expect(validateRegistrationStep("email", { ...draft, email: "not-email" })).toBeDefined();
  expect(validateRegistrationStep("password", { ...draft, password: "short" })).toBeDefined();
});

test("step validation and the request schema reject passwords over bcrypt's 72-byte limit", () => {
  const at72 = "a".repeat(72);
  const over72 = "a".repeat(73);

  expect(validateRegistrationStep("password", { ...draft, password: at72 })).toBeUndefined();
  expect(validateRegistrationStep("password", { ...draft, password: over72 })).toBeDefined();

  expect(
    registrationRequestSchema.safeParse({
      contact_name: "Ana",
      organization_name: "Weft",
      role: "event_manager",
      role_other: null,
      email: "ana@example.com",
      password: over72,
      timezone: "UTC",
      default_language: "en",
    }).success,
  ).toBe(false);
});

test("login requires a valid email and a non-empty password", () => {
  expect(loginRequestSchema.safeParse({ email: "ana@example.com", password: "x" }).success).toBe(true);
  expect(loginRequestSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
});

test("timezone resolution uses IANA output and falls back to UTC", () => {
  expect(resolveBrowserTimezone(() => "America/Bogota")).toBe("America/Bogota");
  expect(resolveBrowserTimezone(() => "")).toBe("UTC");
  expect(resolveBrowserTimezone(() => "Not/A_Real_Zone")).toBe("UTC");
  expect(
    resolveBrowserTimezone(() => {
      throw new Error("Intl unavailable");
    }),
  ).toBe("UTC");
});
