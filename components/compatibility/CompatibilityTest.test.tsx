import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompatibilityTest } from "./CompatibilityTest";
import { content } from "@/content";
import { toQuizQuestions } from "@/lib/compatibilityQuestions";
import type { BankQuestion } from "@/lib/weftTypes";

const BANK: BankQuestion[] = [
  { id: "Q1", prompt: "A question about a genie", kind: "single", seg: 1, options: ["a", "b"] },
  { id: "W2", prompt: "A question about two things", kind: "pick2", seg: 2, options: ["w", "x", "y"] },
];

const QUESTIONS = toQuizQuestions(BANK);

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
