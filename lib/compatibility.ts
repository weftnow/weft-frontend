/**
 * The originator's journey. A solo profile is never shown, so the quiz ends at
 * a share link -- there is no "result" phase for one person.
 */
export type Phase = "intro" | "quiz" | "details" | "submitting" | "share" | "stranded";
export type SelectKind = "single" | "multi";
export type Answers = Record<string, string[]>;

/**
 * How long the loader's phrases take to cycle once. Named for what it drives:
 * there is no "analyzing" phase any more, and the old name outlived it.
 */
export const LOADER_CYCLE_MS = 4400;

export function getSelected(answers: Answers, questionId: string): string[] {
  return answers[questionId] ?? [];
}

export function isSelected(
  answers: Answers,
  questionId: string,
  optionId: string,
): boolean {
  return getSelected(answers, questionId).includes(optionId);
}

export function toggleOption(
  answers: Answers,
  questionId: string,
  optionId: string,
  kind: SelectKind,
  limit?: number,
): Answers {
  const current = getSelected(answers, questionId);
  let next: string[];
  if (kind === "single") {
    next = current.includes(optionId) ? [] : [optionId];
  } else if (current.includes(optionId)) {
    next = current.filter((id) => id !== optionId);
  } else {
    next = [...current, optionId];
    // A pick-2 takes exactly two: a third choice pushes out the oldest, so the
    // option just tapped is always the one selected.
    if (limit !== undefined && next.length > limit) next = next.slice(next.length - limit);
  }
  return { ...answers, [questionId]: next };
}

export function canAdvance(
  answers: Answers,
  questionId: string,
  requiredCount = 1,
): boolean {
  return getSelected(answers, questionId).length === requiredCount;
}

export function nextQuizState(
  activeIndex: number,
  questionCount: number,
): { phase: Phase; activeIndex: number } {
  if (activeIndex >= questionCount - 1) {
    return { phase: "details", activeIndex };
  }
  return { phase: "quiz", activeIndex: activeIndex + 1 };
}

export function prevQuizState(
  activeIndex: number,
): { phase: Phase; activeIndex: number } {
  if (activeIndex <= 0) {
    return { phase: "intro", activeIndex: 0 };
  }
  return { phase: "quiz", activeIndex: activeIndex - 1 };
}

/** Back out of the details form and the last question is waiting, still answered. */
export function backFromDetails(
  questionCount: number,
): { phase: Phase; activeIndex: number } {
  return { phase: "quiz", activeIndex: Math.max(0, questionCount - 1) };
}

/**
 * How far along the quiz is, 0..1. A dot per question was fine for three and
 * impossible for twenty; one bar reads the same at any length.
 */
export function progressFraction(
  activeIndex: number,
  questionCount: number,
): number {
  if (questionCount <= 0) return 0;
  return Math.min(1, Math.max(0, (activeIndex + 1) / questionCount));
}
