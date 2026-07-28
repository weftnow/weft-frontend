import { progressFraction } from "@/lib/compatibility";

export function QuizProgress({
  activeIndex,
  total,
}: {
  activeIndex: number;
  total: number;
}) {
  const current = total > 0 ? Math.min(activeIndex + 1, total) : 0;
  const percent = progressFraction(activeIndex, total) * 100;

  return (
    <div className="ctest-progress">
      <div
        aria-label={`Question ${current} of ${total}`}
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
        {current} of {total}
      </span>
    </div>
  );
}
