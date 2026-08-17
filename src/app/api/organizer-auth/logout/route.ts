import { NextResponse } from "next/server";
import { clearOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";

/**
 * Log out.
 *
 * A route handler behind a plain `<form method="post">` rather than a client
 * component calling fetch: logging out is the one control that has to work when
 * the JavaScript has not loaded or has thrown, and the form POST does.
 *
 * 303 rather than 302 so the browser follows with GET. A 302 after a POST is
 * only conventionally rewritten to GET, and the one client that takes the spec
 * literally would re-POST to the login page.
 */
export async function POST(request: Request) {
  // Browsers send Origin on every POST, so a cross-site form cannot reach the
  // clear. Logging someone out uninvited is only a nuisance, but it is a free
  // one to close.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return new NextResponse(null, { status: 403 });
  }

  const response = NextResponse.redirect(new URL("/organizer/login", request.url), 303);
  clearOrganizerSession(response);
  return response;
}
