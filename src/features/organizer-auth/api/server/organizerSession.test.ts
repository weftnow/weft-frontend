import { expect, test } from "bun:test";
import { NextResponse } from "next/server";
import {
  ORGANIZER_SESSION_COOKIE,
  setOrganizerSession,
} from "./organizerSession";

test("session cookie is HttpOnly, Lax, root-scoped, and seven days", () => {
  const response = NextResponse.json({ status: "authenticated" });
  setOrganizerSession(response, "jwt-secret", false);
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(ORGANIZER_SESSION_COOKIE).toBe("weft_organizer_session");
  expect(cookie).toContain("weft_organizer_session=jwt-secret");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=lax");
  expect(cookie).toContain("Path=/");
  expect(cookie).toContain("Max-Age=604800");
  expect(cookie).not.toContain("Secure");
});

test("production session cookie is Secure", () => {
  const response = NextResponse.json({ status: "authenticated" });
  setOrganizerSession(response, "jwt-secret", true);
  expect(response.headers.get("set-cookie") ?? "").toContain("Secure");
});
