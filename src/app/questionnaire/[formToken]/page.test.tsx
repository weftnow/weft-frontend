import { afterEach, beforeEach, expect, test } from "bun:test";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { backendFormEn } from "@/features/questionnaire/test/backendFormFixtures";
import QuestionnairePage from "../page";
import EventQuestionnairePage, { metadata } from "./page";

let originalUrl: string | undefined;
let originalFetch: typeof fetch;

beforeEach(() => {
  originalUrl = process.env.WEFT_B2B_API_URL;
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
  globalThis.fetch = originalFetch;
});

test("tokenless questionnaire explains how to enter", async () => {
  const page = await QuestionnairePage({ searchParams: Promise.resolve({}) });
  expect(renderToStaticMarkup(page)).toContain("Open your event link");
});

test("a spent link is told to ask the organizer for a new one", async () => {
  // Where /l/[linkToken] sends a link whose event is over. The copy already
  // names the recovery, and the organizer is the only one who can start it.
  const page = await QuestionnairePage({ searchParams: Promise.resolve({ reason: "invalid" }) });
  expect(renderToStaticMarkup(page)).toContain("Ask the event organizer for a new link");
});

test("event page is dynamic, private, and composes a server-loaded definition", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  globalThis.fetch = (async () => Response.json(backendFormEn)) as typeof fetch;

  const page = await EventQuestionnairePage({
    params: Promise.resolve({ formToken: "token-valid-123456" }),
  });
  expect(isValidElement(page)).toBe(true);
  expect(page.props.formToken).toBe("token-valid-123456");
  expect(page.props.initialQuestionnaire.eventName).toBe("Mixer");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("an invalid token renders the invalid-link notice without an upstream call", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({});
  }) as typeof fetch;

  const html = renderToStaticMarkup(
    await EventQuestionnairePage({ params: Promise.resolve({ formToken: "short" }) }),
  );
  expect(html).toContain("This event link isn");
  expect(called).toBe(false);
});
