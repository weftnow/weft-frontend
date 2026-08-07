import type { BankQuestion, BankResponse } from "@/features/demo-b2c/types/contracts";
import fallback from "../data/compatibility-questions.json";

/**
 * The UI's view of a question. The backend sends bare option strings; the quiz
 * needs a stable key per button, and the answer adapter needs to recover the
 * option's position. Minting `<qid>-<index>` here satisfies both, and doing it
 * in one place is what keeps the round-trip honest.
 */
export type QuizOption = { id: string; label: string };

export type QuizQuestion = {
  id: string;
  prompt: string;
  kind: "single" | "multi";
  /** Multi questions only: exactly this many choices. */
  select?: number;
  options: QuizOption[];
};

export function toQuizQuestions(
  questions: readonly BankQuestion[],
): QuizQuestion[] {
  // The callback is annotated so `kind` narrows to the union instead of widening
  // to `string` on the way through `.map`.
  return questions.map((q): QuizQuestion => ({
    id: q.id,
    prompt: q.prompt,
    kind: q.kind === "pick2" ? "multi" : "single",
    // "pick2" means exactly two -- not "two or more".
    ...(q.kind === "pick2" ? { select: 2 } : {}),
    options: q.options.map((label, index) => ({ id: `${q.id}-${index}`, label })),
  }));
}

/**
 * One question, checked hard enough to know it will render: a prompt to read
 * and at least two things to choose between. `seg` is carried through
 * untouched and never read by the UI, so it is not checked here.
 */
export function isBankQuestion(value: unknown): value is BankQuestion {
  if (typeof value !== "object" || value === null) return false;
  const q = value as Partial<BankQuestion>;
  return (
    typeof q.id === "string" &&
    typeof q.prompt === "string" &&
    (q.kind === "single" || q.kind === "pick2") &&
    Array.isArray(q.options) &&
    q.options.length > 1 &&
    q.options.every((o: unknown) => typeof o === "string")
  );
}

/**
 * Guards the upstream payload before it is trusted enough to render. A backend
 * that answers 200 with something unexpected should land on the fallback, not
 * on a blank quiz.
 */
export function isBankResponse(value: unknown): value is BankResponse {
  if (typeof value !== "object" || value === null) return false;
  const { questions, question_set: set } = value as Partial<BankResponse>;
  if (!Array.isArray(questions) || questions.length === 0) return false;
  if (!Array.isArray(set) || set.length === 0) return false;
  return questions.every(isBankQuestion);
}

/**
 * A snapshot of the served bank, generated from weft_core's `public_bank()`.
 * It exists so the quiz still renders when the backend is unreachable --
 * answering still needs the backend, but nobody meets an empty page.
 */
export const FALLBACK_BANK: BankResponse = fallback as BankResponse;
