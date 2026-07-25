import { cookies } from "next/headers";

/**
 * Identity without accounts: the backend hands back a session_id, and this
 * cookie is where it lives. httpOnly keeps it out of reach of JS, and keeping
 * it in a cookie rather than a URL means the id never appears in a link
 * someone could share by accident.
 */
export const SESSION_COOKIE = "weft_session";

/** 30 days, matching the backend's WEFT_INVITE_TTL_DAYS. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function sessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    // Dropped by the browser over plain-HTTP localhost, so development opts out.
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/** Readable anywhere on the server. Returns null when nobody has answered yet. */
export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Route Handlers only. Next.js cannot set a cookie during Server Component
 * render -- the response headers are already on their way.
 */
export async function setSessionCookie(sessionId: string): Promise<void> {
  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    sessionId,
    sessionCookieOptions(process.env.NODE_ENV === "production"),
  );
}
