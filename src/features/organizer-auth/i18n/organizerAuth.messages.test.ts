import { expect, test } from "bun:test";
import { organizerAuthMessages } from "./organizerAuth.messages";
import { ORGANIZER_ROLES, REGISTER_STEPS } from "../types/organizerAuth.types";

test("both languages cover every step and canonical role", () => {
  for (const language of ["en", "es"] as const) {
    const messages = organizerAuthMessages[language];
    expect(Object.keys(messages.registration.prompts)).toEqual([...REGISTER_STEPS]);
    expect(Object.keys(messages.roles)).toEqual([...ORGANIZER_ROLES]);
    expect(messages.login.emailLabel.length > 0).toBe(true);
    expect(messages.login.passwordLabel.length > 0).toBe(true);
    expect(messages.errors.unavailable.length > 0).toBe(true);
  }
});

test("approved English role labels remain exact", () => {
  expect(organizerAuthMessages.en.roles).toEqual({
    founder: "Founder",
    community_manager: "Community Manager",
    event_manager: "Event Manager",
    operations: "Operations",
    marketing_lead: "Marketing lead",
    other: "Other",
  });
});
