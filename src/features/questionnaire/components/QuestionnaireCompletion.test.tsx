import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestionnaireCompletion } from "./QuestionnaireCompletion";

const EVENT_ID = "a8ad9264-b8ce-4ee6-bfad-8f3172a5b76c";

/**
 * This screen used to be a dead end. Nothing else in the app links to an /e/
 * route a guest can reach — the only other one lives inside the conversation
 * they get to from here — so losing this link strands every guest on the
 * thank-you card for the rest of the evening.
 */
test("links forward to the guest's conversation", () => {
  const html = renderToStaticMarkup(
    <QuestionnaireCompletion eventId={EVENT_ID} eventName="Mixer" language="en" />,
  );
  expect(html).toContain(`href="/e/${EVENT_ID}/conversation?lang=en"`);
  expect(html).toContain("Go to your conversation");
});

test("carries the guest's language into the conversation", () => {
  const html = renderToStaticMarkup(
    <QuestionnaireCompletion eventId={EVENT_ID} eventName="Mixer" language="es" />,
  );
  expect(html).toContain(`href="/e/${EVENT_ID}/conversation?lang=es"`);
  expect(html).toContain("Ir a tu conversación");
});
