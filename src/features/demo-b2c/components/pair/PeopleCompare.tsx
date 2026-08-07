import { demoB2cContent } from "@/features/demo-b2c/content";
import { SectionHead } from "./SectionHead";
import { ThreadCross } from "./ThreadCross";
import { pairTraitRows, sharedTopValueKeys } from "@/features/demo-b2c/model/pairView";
import type { PairPerson, ValueEntry } from "@/features/demo-b2c/types/contracts";

/**
 * Both people side by side, joined where they cross. Left/right is the
 * backend's order (sender, responder); neither is "you" -- the link may have
 * been forwarded.
 */
export function PeopleCompare({ people }: { people: PairPerson[] }) {
  if (people.length !== 2) return null;
  const copy = demoB2cContent.pair;
  const pair: readonly [PairPerson, PairPerson] = [people[0], people[1]];
  const shared = sharedTopValueKeys(pair);
  const rows = pairTraitRows(pair, copy.traits);

  return (
    <section className="ctest-section">
      <SectionHead label={copy.peopleLabel} />

      <div className="ctest-compare-head">
        <h3 className="ctest-compare-name ctest-compare-name--left">{pair[0].name}</h3>
        <ThreadCross />
        <h3 className="ctest-compare-name">{pair[1].name}</h3>
      </div>

      <div className="ctest-compare-values">
        {pair.map((person, side) => (
          <ul className={`ctest-values ctest-compare-list${side === 0 ? " ctest-compare-list--left" : ""}`} key={side}>
            {person.top_values.map((value) => (
              <CompareValue key={value.key} shared={shared.has(value.key)} value={value} />
            ))}
          </ul>
        ))}
      </div>

      {rows.length > 0 && (
        <dl className="ctest-compare-rows">
          {rows.map((row) => (
            <div className="ctest-compare-row" key={row.label}>
              <dt className="ctest-compare-label">{row.label}</dt>
              <dd className="ctest-compare-cell ctest-compare-cell--left">
                {row.left ?? <Blank />}
              </dd>
              <dd className="ctest-compare-cell">{row.right ?? <Blank />}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function CompareValue({ shared, value }: { shared: boolean; value: ValueEntry }) {
  const copy = demoB2cContent.pair;
  return (
    <li>
      <span className="ctest-value-name">{value.name}</span>
      {shared && (
        <span className="ctest-compare-shared">
          {" "}
          <span aria-hidden>✓ </span>
          {copy.sharedTag}
        </span>
      )}
      <span className="ctest-value-tagline"> — {value.tagline}</span>
    </li>
  );
}

function Blank() {
  const copy = demoB2cContent.pair;
  return (
    <span className="ctest-compare-cell--blank">
      <span aria-hidden>—</span>
      <span className="sr-only">{copy.notMeasured}</span>
    </span>
  );
}
