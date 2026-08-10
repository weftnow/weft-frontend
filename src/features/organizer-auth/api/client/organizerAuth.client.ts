import type {
  LoginRequestDto,
  OrganizerAuthFailureData,
  RegisterRequestDto,
} from "../../types/organizerAuth.types";
import { isOrganizerAuthField } from "../../schemas/organizerAuth.schema";

const REQUEST_TIMEOUT_MS = 8_000;
const KNOWN_CODES = new Set<OrganizerAuthFailureData["code"]>([
  "validation",
  "emailAlreadyRegistered",
  "invalidCredentials",
  "unavailable",
]);

function isKnownCode(
  value: unknown,
): value is OrganizerAuthFailureData["code"] {
  return typeof value === "string"
    && KNOWN_CODES.has(value as OrganizerAuthFailureData["code"]);
}

export class OrganizerAuthClientError extends Error {
  constructor(readonly data: OrganizerAuthFailureData) {
    super(data.code);
    this.name = "OrganizerAuthClientError";
  }
}

export type OrganizerAuthClient = {
  register(body: RegisterRequestDto): Promise<void>;
  login(body: LoginRequestDto): Promise<void>;
};

async function readFailure(response: Response): Promise<OrganizerAuthFailureData> {
  try {
    const body = await response.json() as { code?: unknown; field?: unknown };
    if (!isKnownCode(body.code)) {
      return { code: "unavailable" };
    }
    if (body.code === "validation") {
      return isOrganizerAuthField(body.field)
        ? { code: "validation", field: body.field }
        : { code: "validation" };
    }
    return { code: body.code };
  } catch {
    return { code: "unavailable" };
  }
}

export function createOrganizerAuthClient(
  fetchImpl: typeof fetch = fetch,
  origin = "",
): OrganizerAuthClient {
  async function post(path: string, body: RegisterRequestDto | LoginRequestDto) {
    let response: Response;
    try {
      response = await fetchImpl(`${origin}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new OrganizerAuthClientError({ code: "unavailable" });
    }
    if (!response.ok) throw new OrganizerAuthClientError(await readFailure(response));
    const parsed = await response.json().catch(() => null);
    if ((parsed as { status?: unknown } | null)?.status !== "authenticated") {
      throw new OrganizerAuthClientError({ code: "unavailable" });
    }
  }

  return {
    register: (body) => post("/api/organizer-auth/register", body),
    login: (body) => post("/api/organizer-auth/login", body),
  };
}

export const organizerAuthClient = createOrganizerAuthClient();
