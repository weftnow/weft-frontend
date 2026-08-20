import { describe, expect, test } from "bun:test";
import { organizerMeSchema, settingsUpdateSchema } from "./settings.schema";

const ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "a@b.co",
  contact_name: "Ana Restrepo",
  organization_name: "Acme Ventures",
  role: "founder",
  role_other: null,
  timezone: "America/Bogota",
  default_language: "es",
  whatsapp: null,
  plan: "free",
};

describe("organizerMeSchema", () => {
  test("rejects a body with no plan, since the plan card would render blank", () => {
    expect(
      organizerMeSchema.safeParse({ ...ME, plan: undefined }).success,
    ).toBe(false);
  });
});

describe("settingsUpdateSchema", () => {
  test("requires role_other when role is other", () => {
    expect(settingsUpdateSchema.safeParse({ ...ME, role: "other" }).success).toBe(false);
    expect(
      settingsUpdateSchema.safeParse({ ...ME, role: "other", role_other: "Chief Vibes" }).success,
    ).toBe(true);
  });

  test("rejects a blank name and turns an empty WhatsApp box into null", () => {
    expect(settingsUpdateSchema.safeParse({ ...ME, organization_name: "   " }).success).toBe(false);
    expect(settingsUpdateSchema.parse({ ...ME, whatsapp: "" }).whatsapp).toBeNull();
  });
});
