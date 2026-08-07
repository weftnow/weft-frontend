import { content } from "@/content";
import { pairTraitRows } from "@/lib/pairView";
import type { PairResult } from "@/lib/weftTypes";
import { ResultIcon, traitIconKind, type ResultIconKind } from "./ResultIcon";

/** A qualitative account of what shaped the result; never a fabricated breakdown. */
export function EvaluationPanel({ result }: { result: PairResult }) {
  const copy = content.compatibilityTest.pair;
  const pair = result.people.length === 2
    ? [result.people[0], result.people[1]] as const
    : null;
  const rows = pair ? pairTraitRows(pair, copy.traits) : [];
  const traitDescriptions: Record<string, string> = {
    [copy.traits.humour]: copy.evaluationTraits.humour,
    [copy.traits.opensUp]: copy.evaluationTraits.opensUp,
    [copy.traits.pace]: copy.evaluationTraits.pace,
    [copy.traits.lifeStage]: copy.evaluationTraits.lifeStage,
  };
  const dimensions = [
    { label: "Values", body: copy.evaluationValues, icon: "values" as ResultIconKind },
    ...rows.map((row) => ({
      label: row.label,
      body: traitDescriptions[row.label],
      icon: traitIconKind(row.label, copy.traits),
    })),
  ];

  return (
    <section className="ctest-result-evaluation">
      <header>
        <h2>{copy.evaluationHeading}</h2>
        <p>{copy.evaluationSub}</p>
      </header>
      <ul className="ctest-result-evaluation-list">
        {dimensions.map((dimension) => (
          <li key={dimension.label}>
            <span aria-hidden className="ctest-result-evaluation-icon">
              <ResultIcon kind={dimension.icon} />
            </span>
            <div>
              <h3>{dimension.label}</h3>
              <p>{dimension.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
