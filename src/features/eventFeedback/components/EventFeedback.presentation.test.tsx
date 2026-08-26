import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EventFeedbackForm } from "./EventFeedbackForm";
import { EventFeedbackThanks } from "./EventFeedbackThanks";

const TABLEMATES = [
  { displayName: "Ana", ref: "ref-ana" },
  { displayName: "Beto", ref: "ref-beto" },
];

function form(overrides: Partial<Parameters<typeof EventFeedbackForm>[0]> = {}) {
  return (
    <EventFeedbackForm
      failed={false}
      language="en"
      onSubmit={() => {}}
      submitting={false}
      tablemates={TABLEMATES}
      {...overrides}
    />
  );
}

test("asks every question on one screen", () => {
  const html = renderToStaticMarkup(form());
  expect(html).toContain("recommend Weft to a friend");
  expect(html).toContain("Did you enjoy the session today?");
  expect(html).toContain("Which matching platform today do you prefer?");
  expect(html).toContain("like to meet again?");
  expect(html).toContain("What could we do better?");
});

test("the platform question offers both names and starts unanswered", () => {
  const html = renderToStaticMarkup(form());
  // The brand names as written, not the wire values.
  expect(html).toContain(">GoMatch<");
  expect(html).toContain(">Weft<");
  expect(html).toContain('aria-label="GoMatch, not selected"');
  expect(html).toContain('aria-label="Weft, not selected"');
  // Nothing is pre-picked: a default here would be a vote nobody cast.
  expect(html).not.toContain('aria-label="GoMatch, selected"');
  expect(html).not.toContain('aria-label="Weft, selected"');
});

test("both scales run 1 to 5 and neither offers a zero", () => {
  const html = renderToStaticMarkup(form());
  for (const value of [1, 2, 3, 4, 5]) {
    expect(html).toContain(`aria-label="${value} out of 5"`);
  }
  expect(html).not.toContain('aria-label="0 out of 5"');
  expect(html).not.toContain('aria-label="6 out of 5"');
  expect(html).not.toContain("out of 10");
});

test("says which end of the scale is which, so nobody has to guess", () => {
  const html = renderToStaticMarkup(form());
  expect(html).toContain("1 is the lowest, 5 is the highest.");
  expect(html).toContain("1 · Not likely");
  expect(html).toContain("5 · Very likely");
  expect(html).toContain("1 · Not really");
  expect(html).toContain("5 · Loved it");
});

test("names the actual people at the table", () => {
  const html = renderToStaticMarkup(form());
  expect(html).toContain(">Ana<");
  expect(html).toContain(">Beto<");
  expect(html).toContain('aria-label="Ana, not selected"');
});

test("two tablemates with the same name are two separate people", () => {
  const html = renderToStaticMarkup(
    form({
      tablemates: [
        { displayName: "Maria", ref: "ref-maria-1" },
        { displayName: "Maria", ref: "ref-maria-2" },
      ],
    }),
  );
  // One button per person, not per name — the selection is keyed by ref, so
  // tapping one Maria cannot rate the other.
  expect(html.split('aria-label="Maria, not selected"').length - 1).toBe(2);
});

test("an unpublished group hides the meet-again question entirely", () => {
  const html = renderToStaticMarkup(form({ tablemates: [] }));
  expect(html).not.toContain("like to meet again?");
  expect(html).toContain("What could we do better?");
});

test("send starts visibly disabled rather than hidden", () => {
  const html = renderToStaticMarkup(form());
  expect(html).toContain("disabled");
  expect(html).toContain("Send");
  expect(html).toContain("Answer all four to send.");
});

test("a failed send says the answers are still there", () => {
  const html = renderToStaticMarkup(form({ failed: true }));
  expect(html).toContain("Your answers are still here");
  expect(html).toContain('role="alert"');
});

test("speaks Spanish when the session does", () => {
  const html = renderToStaticMarkup(form({ language: "es" }));
  expect(html).toContain("recomiendes Weft a un amigo");
  expect(html).toContain("¿Disfrutaste la sesión de hoy?");
  expect(html).toContain("¿Qué plataforma de matching prefieres hoy?");
  // Brand names are not translated.
  expect(html).toContain(">GoMatch<");
  expect(html).toContain("volver a ver?");
  expect(html).toContain("¿Qué podríamos mejorar?");
  expect(html).toContain("1 es lo más bajo, 5 lo más alto.");
  expect(html).toContain("Enviar");
});

test("the thanks screen is terminal and speaks both languages", () => {
  const english = renderToStaticMarkup(<EventFeedbackThanks language="en" />);
  expect(english).toContain("Thanks.");
  expect(english).toContain("the next one gets better");

  const spanish = renderToStaticMarkup(<EventFeedbackThanks language="es" />);
  expect(spanish).toContain("Gracias.");
  expect(spanish).toContain("Así mejora la próxima.");
});
