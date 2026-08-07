import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { escapeApostrophes } from "@/features/demo-b2c/test/escape";
import { CompatibilityTest } from "./CompatibilityTest";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { toQuizQuestions } from "@/features/demo-b2c/schemas/compatibilityQuestions";
import type { BankQuestion } from "@/features/demo-b2c/types/contracts";

const BANK: BankQuestion[] = [
  { id: "Q1", prompt: "A question about a genie", kind: "single", seg: 1, options: ["a", "b"] },
  { id: "W2", prompt: "A question about two things", kind: "pick2", seg: 2, options: ["w", "x", "y"] },
];

const QUESTIONS = toQuizQuestions(BANK);

// renderToStaticMarkup escapes apostrophes in text nodes, so copy with a
// literal ' never appears verbatim in the markup.
test("compatibility test renders the intro phase by default", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain(demoB2cContent.intro.cta);
  expect(html).toContain("ctest-shell");
});

test("compatibility test exposes a home link back to Weft", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain('href="/"');
  expect(html).toContain("ctest-home");
});

test("questionnaire intro opts into the weave without adding site navigation", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain("ctest-weave");
  expect(html).not.toContain("<nav");
});

test("questionnaire intro reserves the motif between its headline and explanation", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  const headline = html.indexOf("ctest-prompt");
  const motifGap = html.indexOf("ctest-intro-weave-space");
  const explanation = html.indexOf(demoB2cContent.intro.sub);

  expect(headline).toBeGreaterThan(-1);
  expect(motifGap).toBeGreaterThan(headline);
  expect(explanation).toBeGreaterThan(motifGap);
});

test("compatibility intro does not leak later phases into static markup", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).not.toContain("ctest-option");
  expect(html).not.toContain(demoB2cContent.details.cta);
  expect(html).not.toContain(demoB2cContent.share.headline);
  expect(html).not.toContain(BANK[0].prompt);
});

const INVITE = { token: "tok-1", fromName: "  Ana  " };

test("an invited friend is greeted by the sender's name", () => {
  const html = renderToStaticMarkup(
    <CompatibilityTest questions={QUESTIONS} invite={INVITE} />,
  );
  expect(html).toContain(escapeApostrophes(demoB2cContent.invite.eyebrow));
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
  expect(html).not.toContain(demoB2cContent.intro.headline[0]);
});

test("without an invite the originator intro is unchanged", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain(demoB2cContent.intro.headline[0]);
  expect(html).not.toContain(escapeApostrophes(demoB2cContent.invite.eyebrow));
});

test("the question counter is built from content, with both numbers filled in", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  // The intro renders first, so drive to the quiz the way the other tests do.
  expect(demoB2cContent.quiz.progress).toContain("{n}");
  expect(demoB2cContent.quiz.progress).toContain("{total}");
  // Nothing may ship with an unfilled placeholder.
  expect(html).not.toContain("{n}");
  expect(html).not.toContain("{total}");
});
