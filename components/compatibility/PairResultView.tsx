import Link from "next/link";
import { content } from "@/content";
import { CtestShell } from "@/components/compatibility/CtestShell";
import { ShareLink } from "@/components/compatibility/ShareLink";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { personTraits, scorePercent } from "@/lib/pairView";
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
 *
 * The staggered entrance is CSS, keyed off the direct children of
 * `.ctest-pair` -- see globals.css. Reordering or wrapping those children
 * changes which delay each block gets.
 */
export function PairResultView({
  result,
  shareToken,
}: {
  result: PairResult;
  shareToken: string | null;
}) {
  const copy = content.compatibilityTest.pair;
  const percent = scorePercent(result.score);

  return (
    <CtestShell align="top">
      <div className="ctest-pair relative z-10">
        <header className="flex flex-col items-center text-center">
          <Eyebrow>{copy.eyebrow}</Eyebrow>

          {/* Deliberately not counted up. A rolling figure and the bar below it
              are two clocks, and when they drift the page shows a number that
              contradicts its own gauge. The bar animates; the number is just
              true, from the first paint and without JavaScript. */}
          <p className="ctest-score" aria-hidden>
            {percent}
            <span className="ctest-score-unit">%</span>
          </p>

          <div
            className="ctest-gauge"
            role="img"
            aria-label={`${copy.scoreLabel} ${percent} out of 100. ${result.band}`}
          >
            <div className="ctest-gauge-track">
              <span className="ctest-gauge-fill" style={{ width: `${percent}%` }} />
              <span className="ctest-gauge-ticks" aria-hidden>
                {/* One cell per band, so the bar is divided the way the
                    sentence below divides the range. */}
                {[0, 1, 2, 3, 4].map((band) => (
                  <span key={band} />
                ))}
              </span>
            </div>
            <p className="ctest-gauge-scale" aria-hidden>
              <span>{copy.scaleLow}</span>
              <span>{copy.scaleHigh}</span>
            </p>
          </div>

          <h1 className="ctest-band">{result.band}</h1>
          <p className="ctest-note">{copy.scoreNote}</p>
        </header>

        <section className="ctest-card">
          <CardHead label={copy.sharedLabel} />
          <p className="ctest-headline">{result.headline}</p>
          {result.shared_values.length > 0 ? (
            <ul className="ctest-values">
              {result.shared_values.map((value, index) => (
                <ValueLine index={index} key={value.key} value={value} withBlurb />
              ))}
            </ul>
          ) : (
            <p className="ctest-body">{copy.noShared}</p>
          )}
        </section>

        <section className="ctest-card">
          <CardHead label={copy.differenceLabel} />
          <p className="ctest-headline">{result.difference}</p>
        </section>

        <div>
          <div className="ctest-card-head justify-center">
            <span aria-hidden className="ctest-rule" />
            <h2 className="ctest-section-label">{copy.peopleLabel}</h2>
          </div>
          <div className="ctest-people">
            {result.people.map((person, index) => (
              // Two people can share a name, so position is the only stable key.
              <PersonCard key={index} person={person} />
            ))}
          </div>
        </div>

        <section className="flex flex-col items-center text-center">
          {shareToken ? (
            <>
              {/* Smaller than the band above it: the result is the page, and
                  the next invitation is the offer that follows it. */}
              <h2 className="ctest-sub-prompt">{copy.shareHeadline}</h2>
              <p className="ctest-body max-w-md text-pretty text-center">
                {copy.shareSub}
              </p>
              <ShareLink token={shareToken} />
            </>
          ) : (
            <PremiumButton href="/compatibility-test" tone="ember">
              {copy.restart}
            </PremiumButton>
          )}

          {/* Offered whether or not they hold a token: someone who followed a
              forwarded link has no session, and the page they land on invites
              them to take the test rather than dead-ending. */}
          <Link
            className="mt-8 font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
            href="/compatibility-test/matches"
          >
            {copy.matchesLink}
          </Link>
        </section>
      </div>
    </CtestShell>
  );
}

function CardHead({ label }: { label: string }) {
  return (
    <div className="ctest-card-head">
      <span aria-hidden className="ctest-rule" />
      <h2 className="ctest-section-label">{label}</h2>
    </div>
  );
}

function ValueLine({
  index,
  value,
  withBlurb,
}: {
  index?: number;
  value: ValueEntry;
  withBlurb?: boolean;
}) {
  const body = (
    <div>
      <span className="ctest-value-name">{value.name}</span>
      <span className="ctest-value-tagline"> — {value.tagline}</span>
      {withBlurb && <p className="ctest-value-blurb">{value.blurb}</p>}
    </div>
  );

  if (index === undefined) return <li>{body}</li>;

  return (
    <li className="ctest-value">
      <span aria-hidden className="ctest-value-index">
        {String(index + 1).padStart(2, "0")}
      </span>
      {body}
    </li>
  );
}

function PersonCard({ person }: { person: PairPerson }) {
  const copy = content.compatibilityTest.pair;
  const traits = personTraits(person, copy.traits);

  return (
    <article className="ctest-card">
      <div className="ctest-person-head">
        <h3 className="ctest-person-name">{person.name}</h3>
      </div>
      <ul className="ctest-values">
        {person.top_values.map((value) => (
          <ValueLine key={value.key} value={value} />
        ))}
      </ul>
      {traits.length > 0 && (
        <dl className="ctest-traits">
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
