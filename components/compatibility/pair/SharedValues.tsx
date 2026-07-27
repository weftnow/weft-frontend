import { content } from "@/content";
import { SectionHead } from "./SectionHead";
import type { PairResult } from "@/lib/weftTypes";

/** What the two lead with -- an editorial list, not a box of data. */
export function SharedValues({ result }: { result: PairResult }) {
  const copy = content.compatibilityTest.pair;

  return (
    <section className="ctest-section">
      <SectionHead label={copy.sharedLabel} />
      <p className="ctest-headline">{result.headline}</p>
      {result.shared_values.length > 0 ? (
        <ul className="ctest-values">
          {result.shared_values.map((value, index) => (
            <li className="ctest-value" key={value.key}>
              <span aria-hidden className="ctest-value-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="ctest-value-name">{value.name}</span>
                <span className="ctest-value-tagline"> — {value.tagline}</span>
                <p className="ctest-value-blurb">{value.blurb}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ctest-body">{copy.noShared}</p>
      )}
    </section>
  );
}
