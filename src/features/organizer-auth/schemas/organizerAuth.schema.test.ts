import { expect, test } from "bun:test";
import {
  loginRequestSchema,
  registrationRequestSchema,
  resolveBrowserTimezone,
  toRegisterRequest,
  validateRegistrationStep,
} from "./organizerAuth.schema";
import { ORGANIZER_ROLES } from "../types/organizerAuth.types";

const draft = {
  contactName: "  Ana Restrepo  ",
  organizationName: "  Weft Events  ",
  role: "event_manager" as const,
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
    email: "ana@example.com",
    password: "longenough",
    timezone: "America/Bogota",
    default_language: "es",
  });
  expect("whatsapp" in payload).toBe(false);
});

test("step validation rejects blanks, invalid email, and short passwords", () => {
  expect(validateRegistrationStep("contact_name", { ...draft, contactName: "   " })).toBeDefined();
  expect(validateRegistrationStep("organization_name", { ...draft, organizationName: "" })).toBeDefined();
  expect(validateRegistrationStep("role", { ...draft, role: null })).toBeDefined();
  expect(validateRegistrationStep("email", { ...draft, email: "not-email" })).toBeDefined();
  expect(validateRegistrationStep("password", { ...draft, password: "short" })).toBeDefined();
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
