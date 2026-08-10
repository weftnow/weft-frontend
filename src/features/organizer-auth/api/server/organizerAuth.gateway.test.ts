import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  loginOrganizer,
  registerOrganizer,
  validateOrganizerSession,
} from "./organizerAuth.gateway";

const registration = {
  contact_name: "Ana Restrepo",
  organization_name: "Weft Events",
  role: "event_manager" as const,
  email: "ana@example.com",
  password: "longenough",
  timezone: "America/Bogota",
  default_language: "es" as const,
};

let originalUrl: string | undefined;

beforeEach(() => {
  originalUrl = process.env.WEFT_B2B_API_URL;
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
});

test("register posts the exact DTO and parses the backend contract", async () => {
  let captured!: Request;
  const outcome = await registerOrganizer(registration, async (input, init) => {
    captured = new Request(input, init);
    return Response.json({
      access_token: "register-secret",
      token_type: "bearer",
      organizer: {
        id: "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
        email: registration.email,
        contact_name: registration.contact_name,
        organization_name: registration.organization_name,
        role: registration.role,
        timezone: registration.timezone,
        default_language: registration.default_language,
        whatsapp: null,
      },
    }, { status: 201 });
  });
  expect(outcome).toEqual({ status: "ok", accessToken: "register-secret" });
  expect(captured.url).toBe("https://b2b.example.test/v1/auth/register");
  expect(captured.method).toBe("POST");
  expect(await captured.json()).toEqual(registration);
});

test("login maps invalid credentials without returning upstream detail", async () => {
  const outcome = await loginOrganizer(
    { email: "ana@example.com", password: "wrong" },
    async () => Response.json(
      { detail: "invalid credentials", code: "domain_error" },
      { status: 401 },
    ),
  );
  expect(outcome).toEqual({ status: "invalidCredentials" });
  expect(JSON.stringify(outcome)).not.toContain("invalid credentials");
});

test("register maps duplicate email and recognized validation fields", async () => {
  const duplicate = await registerOrganizer(
    registration,
    async () => Response.json({ detail: "email already registered" }, { status: 409 }),
  );
  expect(duplicate).toEqual({ status: "emailAlreadyRegistered" });

  const invalid = await registerOrganizer(
    registration,
    async () => Response.json({
      detail: [{ loc: ["body", "role"], msg: "Input should be valid" }],
    }, { status: 422 }),
  );
  expect(invalid).toEqual({ status: "validation", field: "role" });
});

test("session validation distinguishes invalid from unavailable", async () => {
  const valid = await validateOrganizerSession(
    "session-secret",
    async (_input, init) => {
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer session-secret",
      );
      return Response.json([]);
    },
  );
  expect(valid).toEqual({ status: "valid" });

  const invalid = await validateOrganizerSession(
    "expired",
    async () => Response.json({}, { status: 401 }),
  );
  expect(invalid).toEqual({ status: "invalid" });

  const unavailable = await validateOrganizerSession(
    "session-secret",
    async () => {
      throw new Error("offline");
    },
  );
  expect(unavailable).toEqual({ status: "unavailable" });
});
