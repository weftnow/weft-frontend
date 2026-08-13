import { expect, test } from "bun:test";
import {
  createOrganizerAuthClient,
  OrganizerAuthClientError,
} from "./organizerAuth.client";

test("client posts registration to the same-origin BFF", async () => {
  let captured!: Request;
  const client = createOrganizerAuthClient(async (input, init) => {
    captured = new Request(input, init);
    return Response.json({ status: "authenticated" }, { status: 201 });
  }, "http://localhost");
  const body = {
    contact_name: "Ana",
    organization_name: "Weft",
    role: "founder" as const,
    role_other: null,
    email: "ana@example.com",
    password: "longenough",
    timezone: "UTC",
    default_language: "en" as const,
  };
  await client.register(body);
  expect(captured.url).toBe("http://localhost/api/organizer-auth/register");
  expect(captured.method).toBe("POST");
  expect(await captured.json()).toEqual(body);
});

test("client decodes only known failure codes", async () => {
  const client = createOrganizerAuthClient(async () => Response.json(
    { code: "emailAlreadyRegistered" },
    { status: 409 },
  ), "http://localhost");
  try {
    await client.register({
      contact_name: "Ana",
      organization_name: "Weft",
      role: "founder",
      role_other: null,
      email: "ana@example.com",
      password: "longenough",
      timezone: "UTC",
      default_language: "en",
    });
    throw new Error("expected auth client failure");
  } catch (error) {
    expect(error instanceof OrganizerAuthClientError).toBe(true);
    expect((error as OrganizerAuthClientError).data).toEqual({
      code: "emailAlreadyRegistered",
    });
  }
});

test("unknown and malformed failures collapse to unavailable", async () => {
  const client = createOrganizerAuthClient(async () => Response.json(
    { code: "internal-database-state" },
    { status: 500 },
  ), "http://localhost");
  try {
    await client.login({ email: "ana@example.com", password: "wrong" });
    throw new Error("expected auth client failure");
  } catch (error) {
    expect((error as OrganizerAuthClientError).data).toEqual({ code: "unavailable" });
  }
});
