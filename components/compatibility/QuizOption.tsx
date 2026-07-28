import type { QuizOption } from "@/lib/compatibilityQuestions";

export function QuizOptionCard({
  option,
  optionIndex,
  selected,
  kind,
  onChoose,
}: {
  option: QuizOption;
  optionIndex: number;
  selected: boolean;
  kind: "single" | "multi";
  onChoose: () => void;
}) {
  const marker = String.fromCharCode(65 + optionIndex);

  return (
    <button
      aria-checked={selected}
      className={`ctest-option${selected ? " ctest-option--on" : ""}`}
      onClick={onChoose}
      role={kind === "single" ? "radio" : "checkbox"}
      type="button"
    >
      <span
        aria-hidden
        className={`ctest-option-marker ctest-option-marker--${optionIndex % 4}`}
      >
        {marker}
      </span>
      <span className="ctest-option-label">{option.label}</span>
      <span aria-hidden className="ctest-option-check">
        &#10003;
      </span>
    </button>
  );
}
