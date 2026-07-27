import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { escapeApostrophes } from "@/lib/testEscape";
import { CompatibilityTest } from "./CompatibilityTest";
import { content } from "@/content";
import { toQuizQuestions } from "@/lib/compatibilityQuestions";
import type { BankQuestion } from "@/lib/weftTypes";

const BANK: BankQuestion[] = [
  { id: "Q1", prompt: "A question about a genie", kind: "single", seg: 1, options: ["a", "b"] },
  { id: "W2", prompt: "A question about two things", kind: "pick2", seg: 2, options: ["w", "x", "y"] },
];

const QUESTIONS = toQuizQuestions(BANK);

// renderToStaticMarkup escapes apostrophes in text nodes, so copy with a
// literal ' never appears verbatim in the markup.
test("compatibility test renders the intro phase by default", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain(content.compatibilityTest.intro.cta);
  expect(html).toContain("ctest-shell");
});

test("compatibility test exposes a home link back to Weft", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain('href="/"');
  expect(html).toContain("ctest-home");
});

test("compatibility intro does not leak later phases into static markup", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).not.toContain("ctest-option");
  expect(html).not.toContain(content.compatibilityTest.details.cta);
  expect(html).not.toContain(content.compatibilityTest.share.headline);
  expect(html).not.toContain(BANK[0].prompt);
});

const INVITE = { token: "tok-1", fromName: "  Ana  " };

test("an invited friend is greeted by the sender's name", () => {
  const html = renderToStaticMarkup(
    <CompatibilityTest questions={QUESTIONS} invite={INVITE} />,
  );
  expect(html).toContain(escapeApostrophes(content.compatibilityTest.invite.eyebrow));
  // withName trims the name and fills every {name} slot.
  expect(html).toContain("Ana wants to know how you two connect.");
  expect(html).toContain('aria-label="Answer Ana&#x27;s questions"');
  expect(html).not.toContain("{name}");
  expect(html).toContain("The same twenty questions they answered");
});

test("the invited intro replaces the originator's, rather than joining it", () => {
  const html = renderToStaticMarkup(
    <CompatibilityTest questions={QUESTIONS} invite={INVITE} />,
  );
  expect(html).not.toContain(content.compatibilityTest.intro.headline[0]);
});

test("without an invite the originator intro is unchanged", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain(content.compatibilityTest.intro.headline[0]);
  expect(html).not.toContain(escapeApostrophes(content.compatibilityTest.invite.eyebrow));
});
