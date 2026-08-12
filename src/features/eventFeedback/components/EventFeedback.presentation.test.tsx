import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EventFeedbackForm } from "./EventFeedbackForm";
import { EventFeedbackThanks } from "./EventFeedbackThanks";

function form(overrides: Partial<Parameters<typeof EventFeedbackForm>[0]> = {}) {
  return (
    <EventFeedbackForm
      failed={false}
      language="en"
      onSubmit={() => {}}
      submitting={false}
      {...overrides}
    />
  );
}

test("asks all three questions on one screen", () => {
  const html = renderToStaticMarkup(form());
  expect(html).toContain("recommend Weft to a friend");
  expect(html).toContain("How was tonight?");
  expect(html).toContain("What could we do better?");
});

test("offers eleven recommend scores and five ratings", () => {
  const html = renderToStaticMarkup(form());
  for (const score of [0, 5, 10]) {
    expect(html).toContain(`aria-label="${score} out of 10"`);
  }
  for (const rating of [1, 3, 5]) {
    expect(html).toContain(`aria-label="${rating} out of 5"`);
  }
  expect(html).not.toContain('aria-label="11 out of 10"');
  expect(html).not.toContain('aria-label="0 out of 5"');
});

test("send starts visibly disabled rather than hidden", () => {
  const html = renderToStaticMarkup(form());
  expect(html).toContain("disabled");
  expect(html).toContain("Send");
  expect(html).toContain("Answer all three to send.");
});

test("labels both ends of the recommend scale", () => {
  const html = renderToStaticMarkup(form());
  expect(html).toContain("Not likely");
  expect(html).toContain("Very likely");
});

test("a failed send says the answers are still there", () => {
  const html = renderToStaticMarkup(form({ failed: true }));
  expect(html).toContain("Your answers are still here");
  expect(html).toContain('role="alert"');
});

test("speaks Spanish when the session does", () => {
  const html = renderToStaticMarkup(form({ language: "es" }));
  expect(html).toContain("recomiendes Weft a un amigo");
  expect(html).toContain("¿Cómo estuvo esta noche?");
  expect(html).toContain("¿Qué podríamos mejorar?");
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
