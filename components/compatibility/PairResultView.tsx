import { content } from "@/content";
import { CtestShell } from "@/components/compatibility/CtestShell";
import { ShareLink } from "@/components/compatibility/ShareLink";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { personTraits } from "@/lib/pairView";
import type { PairPerson, PairResult, ValueEntry } from "@/lib/weftTypes";

/**
 * The compatibility result, for both people at once.
 *
 * `result.people` is exactly two, in the backend's order -- the sender first,
 * the responder second -- but nothing in the payload identifies which of them
 * is reading it, and this link may have been forwarded. Both are named; nobody
 * is called "you".
 *
 * `shareToken` is present only for the person who just finished, carried on
 * the query string from their own submission. Without it there is no link to
 * offer, so the page offers the quiz instead.
 */
export function PairResultView({
  result,
  shareToken,
}: {
  result: PairResult;
  shareToken: string | null;
}) {
  const copy = content.compatibilityTest.pair;

  return (
    <CtestShell>
      <div className="ctest-pair relative z-10">
        <header className="flex flex-col items-center text-center">
          <span className="ctest-eyebrow">{copy.eyebrow}</span>
          <h1 className="ctest-prompt">{result.headline}</h1>
          <p className="ctest-chip mt-5">{result.band}</p>
        </header>

        <section className="ctest-card">
          <h2 className="ctest-section-label">{copy.sharedLabel}</h2>
          {result.shared_values.length > 0 ? (
            <ul className="ctest-values mt-3">
              {result.shared_values.map((value) => (
                <ValueLine key={value.key} value={value} withBlurb />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-base leading-relaxed text-ink/62">{copy.noShared}</p>
          )}

          <h2 className="ctest-section-label mt-8">{copy.differenceLabel}</h2>
          <p className="mt-3 text-base leading-relaxed text-ink/62">{result.difference}</p>
        </section>

        <div className="ctest-people">
          {result.people.map((person, index) => (
            // Two people can share a name, so position is the only stable key.
            <PersonCard key={index} person={person} />
          ))}
        </div>

        <section className="flex flex-col items-center text-center">
          {shareToken ? (
            <>
              <h2 className="ctest-prompt">{copy.shareHeadline}</h2>
              <p className="mt-3 max-w-md text-pretty text-base leading-relaxed text-ink/62">
                {copy.shareSub}
              </p>
              <ShareLink token={shareToken} />
            </>
          ) : (
            <PremiumButton href="/compatibility-test" tone="ember">
              {copy.restart}
            </PremiumButton>
          )}
        </section>
      </div>
    </CtestShell>
  );
}

function ValueLine({ value, withBlurb }: { value: ValueEntry; withBlurb?: boolean }) {
  return (
    <li>
      <span className="ctest-value-name">{value.name}</span>
      <span className="ctest-value-tagline"> — {value.tagline}</span>
      {withBlurb && <p className="ctest-value-blurb">{value.blurb}</p>}
    </li>
  );
}

function PersonCard({ person }: { person: PairPerson }) {
  const copy = content.compatibilityTest.pair;
  const traits = personTraits(person, copy.traits);

  return (
    <article className="ctest-card">
      <h3 className="ctest-person-name">{person.name}</h3>
      <ul className="ctest-values mt-4">
        {person.top_values.map((value) => (
          <ValueLine key={value.key} value={value} />
        ))}
      </ul>
      {traits.length > 0 && (
        <dl className="ctest-traits mt-6">
          {traits.map((trait) => (
            <div className="ctest-trait" key={trait.label}>
              <dt className="ctest-trait-label">{trait.label}</dt>
              <dd className="ctest-trait-value">{trait.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
