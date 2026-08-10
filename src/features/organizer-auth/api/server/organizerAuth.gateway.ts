import { z } from "zod";
import { isOrganizerAuthField } from "../../schemas/organizerAuth.schema";
import { ORGANIZER_ROLES } from "../../types/organizerAuth.types";
import type {
  LoginRequestDto,
  OrganizerAuthField,
  RegisterRequestDto,
} from "../../types/organizerAuth.types";

const REQUEST_TIMEOUT_MS = 8_000;

export type OrganizerAuthGatewayFailure =
  | { status: "validation"; field?: OrganizerAuthField }
  | { status: "emailAlreadyRegistered" }
  | { status: "invalidCredentials" }
  | { status: "unavailable" };

export type OrganizerAuthGatewayOutcome =
  | { status: "ok"; accessToken: string }
  | OrganizerAuthGatewayFailure;

export type OrganizerSessionOutcome =
  | { status: "valid" }
  | { status: "invalid" }
  | { status: "unavailable" };

const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("bearer"),
});

const registerResponseSchema = tokenSchema.extend({
  organizer: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    contact_name: z.string(),
    organization_name: z.string(),
    role: z.enum(ORGANIZER_ROLES).nullable(),
    timezone: z.string(),
    default_language: z.string(),
    whatsapp: z.string().nullable(),
  }),
});

function backendBaseUrl(): string | null {
  return process.env.WEFT_B2B_API_URL?.replace(/\/$/, "") ?? null;
}

async function validationField(response: Response): Promise<OrganizerAuthField | undefined> {
  try {
    const body = await response.json() as { detail?: unknown };
    if (!Array.isArray(body.detail)) return undefined;
    for (const issue of body.detail) {
      const location = (issue as { loc?: unknown } | null)?.loc;
      const field = Array.isArray(location) ? location[1] : undefined;
      if (isOrganizerAuthField(field)) return field;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function authRequest(
  operation: "register" | "login",
  body: RegisterRequestDto | LoginRequestDto,
  fetchImpl: typeof fetch,
): Promise<OrganizerAuthGatewayOutcome> {
  const base = backendBaseUrl();
  if (!base) {
    console.error(`organizer auth ${operation} failed`, "configuration");
    return { status: "unavailable" };
  }

  let response: Response;
  try {
    response = await fetchImpl(`${base}/v1/auth/${operation}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    console.error(`organizer auth ${operation} failed`, "network");
    return { status: "unavailable" };
  }

  if (!response.ok) {
    console.error(`organizer auth ${operation} failed`, response.status);
    if (operation === "login" && response.status === 401) {
      return { status: "invalidCredentials" };
    }
    if (operation === "register" && response.status === 409) {
      return { status: "emailAlreadyRegistered" };
    }
    if (response.status === 422) {
      const field = await validationField(response);
      return field ? { status: "validation", field } : { status: "validation" };
    }
    return { status: "unavailable" };
  }

  try {
    const parsed = operation === "register"
      ? registerResponseSchema.parse(await response.json())
      : tokenSchema.parse(await response.json());
    return { status: "ok", accessToken: parsed.access_token };
  } catch {
    console.error(`organizer auth ${operation} failed`, "invalid-body");
    return { status: "unavailable" };
  }
}

export function registerOrganizer(
  body: RegisterRequestDto,
  fetchImpl: typeof fetch = fetch,
) {
  return authRequest("register", body, fetchImpl);
}

export function loginOrganizer(
  body: LoginRequestDto,
  fetchImpl: typeof fetch = fetch,
) {
  return authRequest("login", body, fetchImpl);
}

export async function validateOrganizerSession(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizerSessionOutcome> {
  const base = backendBaseUrl();
  if (!base) return { status: "unavailable" };
  try {
    const response = await fetchImpl(`${base}/v1/events`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status === 401 || response.status === 403) return { status: "invalid" };
    if (!response.ok) return { status: "unavailable" };
    return z.array(z.unknown()).safeParse(await response.json()).success
      ? { status: "valid" }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
