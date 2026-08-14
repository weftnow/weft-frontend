import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { sharedChallengeSessionSchema } from "../schemas/sharedChallenge.schema";
import type { SharedChallengeSession } from "../types/sharedChallenge.types";
import { SharedChallenge } from "./SharedChallenge";
import { SharedChallengeComplete } from "./SharedChallengeComplete";

const EVENT_ID = "a8ad9264-b8ce-4ee6-bfad-8f3172a5b76c";
/** What a guest's link actually carries: a signed form token, not a UUID. */
const FORM_TOKEN = "ImE4YWQ5MjY0LWI4Y2UtNGVlNi1iZmFkIg.aJvKxQ.signature";

function session(overrides: Partial<SharedChallengeSession> = {}): SharedChallengeSession {
  return sharedChallengeSessionSchema.parse({
    eventId: EVENT_ID,
    phaseId: "phase_2",
    language: "en",
    status: "active",
    challenge: "If this group could change one thing about how people find work, what would it be?",
    timerStartedAt: null,
    timerEndsAt: new Date(Date.now() + 300_000).toISOString(),
    closingLine: null,
    ...overrides,
  });
}

test("puts the challenge in the primary heading with a group countdown", () => {
  const html = renderToStaticMarkup(<SharedChallenge session={session()} />);
  expect(html).toContain("<h1");
  expect(html).toContain("how people find work");
  expect(html).toContain("Phase 2");
  expect(html).toContain('role="timer"');
});

test("names nobody, because a shared challenge has no turns", () => {
  const html = renderToStaticMarkup(<SharedChallenge session={session()} />);
  expect(html).not.toContain("turn");
  expect(html).not.toContain("data-active");
});

test("falls back to a prompt rather than rendering a blank heading", () => {
  const html = renderToStaticMarkup(<SharedChallenge session={session({ challenge: "  " })} />);
  expect(html).toContain("<h1");
  expect(html).toContain("what you would change");
});

test("speaks the session's language", () => {
  const html = renderToStaticMarkup(
    <SharedChallenge session={session({ language: "es" })} />,
  );
  expect(html).toContain("Fase 2");
  expect(html).toContain("tiempo restante");
});

test("the complete screen shows the backend's closing line", () => {
  const html = renderToStaticMarkup(
    <SharedChallengeComplete
      closingLine="¡Tiempo! Antes de separarse — intercambien contactos con quien quieran volver a ver."
      sessionKey={EVENT_ID}
      language="es"
    />,
  );
  expect(html).toContain("intercambien contactos");
});

test("the complete screen still says something when the closing line is missing", () => {
  const english = renderToStaticMarkup(
    <SharedChallengeComplete closingLine={null} sessionKey={EVENT_ID} language="en" />,
  );
  expect(english).toContain("swap contacts");

  const spanish = renderToStaticMarkup(
    <SharedChallengeComplete closingLine={null} sessionKey={EVENT_ID} language="es" />,
  );
  expect(spanish).toContain("intercambien contactos");
});

/**
 * The hand-off carries the session key — the form token — not the event id.
 * It used to point at `/e/{eventId}/feedback`, which no session could be
 * resolved from: the guest's cookie holds a session handle, and only
 * `/f/{formToken}/resume` trades one of those for a token the backend accepts.
 * Every submission was refused, so nothing was ever saved.
 */
test("the complete screen hands off to feedback by form token, carrying the language", () => {
  const english = renderToStaticMarkup(
    <SharedChallengeComplete closingLine={null} sessionKey={FORM_TOKEN} language="en" />,
  );
  expect(english).toContain(`href="/questionnaire/${FORM_TOKEN}/feedback?lang=en"`);
  expect(english).toContain("Before you go");

  const spanish = renderToStaticMarkup(
    <SharedChallengeComplete closingLine={null} sessionKey={FORM_TOKEN} language="es" />,
  );
  expect(spanish).toContain(`href="/questionnaire/${FORM_TOKEN}/feedback?lang=es"`);
  expect(spanish).toContain("Antes de irte");
});
