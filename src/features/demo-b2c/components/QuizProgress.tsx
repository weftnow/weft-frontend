import { progressFraction } from "@/features/demo-b2c/model/compatibility";

export function QuizProgress({
  activeIndex,
  labelTemplate = "{n} of {total}",
  total,
}: {
  activeIndex: number;
  labelTemplate?: string;
  total: number;
}) {
  const current = total > 0 ? Math.min(activeIndex + 1, total) : 0;
  const percent = progressFraction(activeIndex, total) * 100;
  const label = labelTemplate
    .replace("{n}", String(current))
    .replace("{total}", String(total));

  return (
    <div className="ctest-progress">
      <div
        aria-label={`Question ${label}`}
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={current}
        className="ctest-progressbar"
        role="progressbar"
      >
        <span
          className="ctest-progressbar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span aria-hidden="true" className="ctest-progress-count">
        {label}
      </span>
    </div>
  );
}
