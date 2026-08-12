import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { sharedChallengeSessionSchema } from "../schemas/sharedChallenge.schema";
import type { SharedChallengeSession } from "../types/sharedChallenge.types";
import { SharedChallenge } from "./SharedChallenge";
import { SharedChallengeComplete } from "./SharedChallengeComplete";

const EVENT_ID = "a8ad9264-b8ce-4ee6-bfad-8f3172a5b76c";

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
      eventId={EVENT_ID}
      language="es"
    />,
  );
  expect(html).toContain("intercambien contactos");
});

test("the complete screen still says something when the closing line is missing", () => {
  const english = renderToStaticMarkup(
    <SharedChallengeComplete closingLine={null} eventId={EVENT_ID} language="en" />,
  );
  expect(english).toContain("swap contacts");

  const spanish = renderToStaticMarkup(
    <SharedChallengeComplete closingLine={null} eventId={EVENT_ID} language="es" />,
  );
  expect(spanish).toContain("intercambien contactos");
});

test("the complete screen hands off to feedback, carrying the language", () => {
  const english = renderToStaticMarkup(
    <SharedChallengeComplete closingLine={null} eventId={EVENT_ID} language="en" />,
  );
  expect(english).toContain(`href="/e/${EVENT_ID}/feedback?lang=en"`);
  expect(english).toContain("Before you go");

  const spanish = renderToStaticMarkup(
    <SharedChallengeComplete closingLine={null} eventId={EVENT_ID} language="es" />,
  );
  expect(spanish).toContain(`href="/e/${EVENT_ID}/feedback?lang=es"`);
  expect(spanish).toContain("Antes de irte");
});
