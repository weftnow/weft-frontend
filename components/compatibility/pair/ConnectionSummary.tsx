import { content } from "@/content";
import { pairTraitRows } from "@/lib/pairView";
import type { PairResult } from "@/lib/weftTypes";

/** The reference's two-column read: overlap beside useful difference. */
export function ConnectionSummary({ result }: { result: PairResult }) {
  const copy = content.compatibilityTest.pair;
  const pair = result.people.length === 2
    ? [result.people[0], result.people[1]] as const
    : null;
  const rows = pair ? pairTraitRows(pair, copy.traits) : [];

  return (
    <section className="ctest-result-summary" aria-label="Compatibility summary">
      <div className="ctest-result-summary-column ctest-result-summary-column--match">
        <SummaryHead mark="✓" tone="match" title={copy.matchLabel} body={copy.matchSub} />
        {result.shared_values.length > 0 ? (
          <ul className="ctest-result-list">
            {result.shared_values.map((value) => (
              <li className="ctest-result-list-item" key={value.key}>
                <span aria-hidden className="ctest-result-item-icon">♡</span>
                <div>
                  <h3>
                    {value.name}
                    <span className="ctest-result-shared">
                      <span aria-hidden> ✓</span> {copy.sharedTag}
                    </span>
                  </h3>
                  <p className="ctest-result-item-tagline">{value.tagline}</p>
                  <p>{value.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ctest-body ctest-result-empty">{copy.noShared}</p>
        )}
      </div>

      <div className="ctest-result-summary-column ctest-result-summary-column--difference">
        <SummaryHead
          mark="×"
          tone="difference"
          title={copy.differenceLabel}
          body={copy.differenceSub}
        />
        <p className="ctest-result-difference">{result.difference}</p>
        {rows.length > 0 && (
          <dl className="ctest-result-traits">
            {rows.map((row) => (
              <div className="ctest-result-trait" key={row.label}>
                <span aria-hidden className="ctest-result-item-icon">↕</span>
                <div>
                  <dt>{row.label}</dt>
                  <dd>
                    {row.left ?? <Blank />}
                    <span aria-hidden className="ctest-result-trait-divider"> / </span>
                    {row.right ?? <Blank />}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

function SummaryHead({
  body,
  mark,
  title,
  tone,
}: {
  body: string;
  mark: string;
  title: string;
  tone: "match" | "difference";
}) {
  return (
    <header className="ctest-result-summary-head">
      <span
        aria-hidden
        className={`ctest-result-summary-mark ctest-result-summary-mark--${tone}`}
      >
        {mark}
      </span>
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </header>
  );
}

function Blank() {
  const copy = content.compatibilityTest.pair;
  return (
    <span className="ctest-result-trait-blank">
      <span aria-hidden>—</span>
      <span className="sr-only">{copy.notMeasured}</span>
    </span>
  );
}
