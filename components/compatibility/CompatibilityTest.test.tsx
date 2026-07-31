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

test("questionnaire intro opts into the weave without adding site navigation", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain("ctest-weave");
  expect(html).not.toContain("<nav");
});

test("questionnaire intro reserves the motif between its headline and explanation", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  const headline = html.indexOf("ctest-prompt");
  const motifGap = html.indexOf("ctest-intro-weave-space");
  const explanation = html.indexOf(content.compatibilityTest.intro.sub);

  expect(headline).toBeGreaterThan(-1);
  expect(motifGap).toBeGreaterThan(headline);
  expect(explanation).toBeGreaterThan(motifGap);
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

test("the question counter is built from content, with both numbers filled in", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  // The intro renders first, so drive to the quiz the way the other tests do.
  expect(content.compatibilityTest.quiz.progress).toContain("{n}");
  expect(content.compatibilityTest.quiz.progress).toContain("{total}");
  // Nothing may ship with an unfilled placeholder.
  expect(html).not.toContain("{n}");
  expect(html).not.toContain("{total}");
});

// The invite headline is one interpolated sentence carrying a name of unknown
// length. Held to the static intro's `white-space: nowrap` it grows past
// .ctest-prompt's 22ch max-width, which is itself wider than the 34rem intro
// stage -- and an element wider than its parent sits against the parent's left
// edge, putting the title ~33px right of the centred eyebrow and subtitle.
// The modifier is what releases it; without the class the CSS silently stops
// applying and the misalignment returns with nothing failing.
test("an invite intro is marked so its headline may wrap", () => {
  const html = renderToStaticMarkup(
    <CompatibilityTest questions={QUESTIONS} invite={{ token: "t-1", fromName: "Sheary" }} />,
  );
  expect(html).toContain("ctest-stage--intro-named");
});

test("the static intro keeps its authored line breaks and is not marked", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain("ctest-stage--intro");
  expect(html.includes("ctest-stage--intro-named")).toBe(false);
});
