import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ORGANIZER_SESSION_COOKIE = "weft_organizer_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setOrganizerSession(
  response: NextResponse,
  accessToken: string,
  secure = process.env.NODE_ENV === "production",
): void {
  response.cookies.set(ORGANIZER_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Expire the cookie rather than delete it.
 *
 * `cookies.delete` drops the attributes the cookie was written with, and a
 * browser only replaces a cookie whose path and domain match — so the safe
 * clear is a re-set carrying the same attributes with maxAge 0.
 */
export function clearOrganizerSession(
  response: NextResponse,
  secure = process.env.NODE_ENV === "production",
): void {
  response.cookies.set(ORGANIZER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readOrganizerSession(): Promise<string | null> {
  return (await cookies()).get(ORGANIZER_SESSION_COOKIE)?.value ?? null;
}
