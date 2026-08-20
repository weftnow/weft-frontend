import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsCards } from "./SettingsCards";
import type { OrganizerMe } from "../schemas/settings.schema";

const ORGANIZER: OrganizerMe = {
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

describe("SettingsCards", () => {
  // role_other only makes sense once "other" is picked — showing it for
  // "founder" would ask every organizer to explain a role they didn't choose.
  test("the role_other box appears only once the role is other", () => {
    const named = renderToStaticMarkup(<SettingsCards organizer={ORGANIZER} />);
    expect(named).not.toContain("What should we call your role?");

    const other = renderToStaticMarkup(
      <SettingsCards organizer={{ ...ORGANIZER, role: "other", role_other: "Chief Vibes" }} />,
    );
    expect(other).toContain("What should we call your role?");
  });
});
