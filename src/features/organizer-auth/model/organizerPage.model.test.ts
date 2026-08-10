import { expect, test } from "bun:test";
import { resolveOrganizerPage } from "./organizerPage.model";

test("missing session redirects without calling FastAPI", async () => {
  let calls = 0;
  const result = await resolveOrganizerPage(null, async () => {
    calls += 1;
    return { status: "valid" };
  });
  expect(result).toEqual({ status: "redirect" });
  expect(calls).toBe(0);
});

test("valid, invalid, and unavailable sessions remain distinct", async () => {
  expect(await resolveOrganizerPage("token", async () => ({ status: "valid" }))).toEqual({ status: "authenticated" });
  expect(await resolveOrganizerPage("token", async () => ({ status: "invalid" }))).toEqual({ status: "redirect" });
  expect(await resolveOrganizerPage("token", async () => ({ status: "unavailable" }))).toEqual({ status: "unavailable" });
});
