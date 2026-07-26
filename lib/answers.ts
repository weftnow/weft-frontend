import type { Answers } from "@/lib/compatibility";
import type { QuizQuestion } from "@/lib/compatibilityQuestions";
import type { BackendAnswers } from "@/lib/weftTypes";

/**
 * Option ids are `<questionId>-<index>`, where the index is the option's
 * position in the served question. The backend identifies options by position,
 * so the suffix is the wire value -- not a cosmetic id.
 */
export function optionIndex(optionId: string, questionId: string): number {
  const prefix = `${questionId}-`;
  if (!optionId.startsWith(prefix)) {
    throw new Error(`option ${optionId} does not belong to ${questionId}`);
  }
  const raw = optionId.slice(prefix.length);
  const index = Number(raw);
  if (raw === "" || !Number.isInteger(index) || index < 0) {
    throw new Error(`option ${optionId} has no valid index`);
  }
  return index;
}

/** How many selections a question needs: pick-2 says so, everything else is 1. */
function requiredCount(question: QuizQuestion): number {
  return question.select ?? 1;
}

/**
 * UI answers (keyed by option id) -> the backend's positional format.
 * Unanswered questions are omitted and unknown question ids are dropped: the
 * backend rejects a stray qid outright, so there is no value in forwarding one.
 */
export function toBackendAnswers(
  answers: Answers,
  questions: readonly QuizQuestion[],
): BackendAnswers {
  const out: BackendAnswers = {};
  for (const question of questions) {
    const selected = answers[question.id] ?? [];
    if (selected.length === 0) continue;
    const indices = selected.map((id) => optionIndex(id, question.id));
    out[question.id] = question.kind === "multi" ? indices : indices[0];
  }
  return out;
}

/**
 * Questions still needing an answer. The backend refuses a partial submission,
 * so the UI gates on this rather than discovering it from a 400.
 */
export function unansweredQuestions(
  answers: Answers,
  questions: readonly QuizQuestion[],
): string[] {
  return questions
    .filter((q) => (answers[q.id]?.length ?? 0) !== requiredCount(q))
    .map((q) => q.id);
}

/**
 * Index in `questions` of the first unanswered question, or -1 if every
 * question is answered. Defined in terms of `unansweredQuestions` so the two
 * can never disagree about what counts as a gap.
 */
export function firstUnansweredIndex(
  answers: Answers,
  questions: readonly QuizQuestion[],
): number {
  const gaps = unansweredQuestions(answers, questions);
  if (gaps.length === 0) return -1;
  return questions.findIndex((q) => q.id === gaps[0]);
}
