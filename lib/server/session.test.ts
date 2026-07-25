import { describe, expect, test } from "bun:test";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "./session";

describe("session cookie", () => {
  test("is named for the app and lives as long as an invite", () => {
    expect(SESSION_COOKIE).toBe("weft_session");
    // 30 days, matching WEFT_INVITE_TTL_DAYS -- a session cookie would strand
    // an originator who closed their browser before their friend answered.
    expect(SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 30);
  });

  test("is unreadable by JS and scoped to the whole site", () => {
    const opts = sessionCookieOptions(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });

  test("is Secure in production", () => {
    expect(sessionCookieOptions(true).secure).toBe(true);
  });

  test("is not Secure in development", () => {
    // A Secure cookie is silently dropped over plain-HTTP localhost.
    expect(sessionCookieOptions(false).secure).toBe(false);
  });
});
