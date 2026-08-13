import { expect, test } from "bun:test";
import { groupRevealSchema } from "./groupReveal.schema";

const group = { group_index: 0, colour: "amber", confirmed: false, reveal_at: "2026-08-13T12:00:05+00:00", server_time: "2026-08-13T12:00:00+00:00", tablemates: [{ display_name: "Maya Chen", company: null, role: "Engineering · Product", profile: "Build rituals." }] };

test("accepts only the browser-safe enriched group response", () => {
  expect(groupRevealSchema.parse(group).tablemates[0].company).toBeNull();
  for (const invalid of [{ ...group, group_index: -1 }, { ...group, attendee_id: "secret" }, { ...group, tablemates: [{ ...group.tablemates[0], profile: undefined }] }]) {
    expect(groupRevealSchema.safeParse(invalid).success).toBeFalse();
  }
});
