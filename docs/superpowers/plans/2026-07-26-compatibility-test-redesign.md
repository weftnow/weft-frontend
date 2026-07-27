# Compatibility Test Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the compatibility test flow (quiz, details form, share screen, pair result, matches) to the homepage's editorial standard, per `docs/superpowers/specs/2026-07-26-compatibility-test-redesign-design.md`.

**Architecture:** The pair result page splits into five section components under `components/compatibility/pair/`, composed by `PairResultView`. All new styling extends the `ctest-*` vocabulary in `app/globals.css` (unlayered CSS; Tailwind utilities lose to it — spacing between ctest blocks lives in the CSS file, not `mt-*` classes). Pure logic (trait-row pairing, shared-key intersection, pick-two hint) lands in `lib/` with tests.

**Tech Stack:** Next.js 16 (App Router, this repo's patched version — read `node_modules/next/dist/docs/` before touching anything under `app/`), React 19, Tailwind 4 via `@theme` tokens, `bun test` with `renderToStaticMarkup` string assertions.

## Global Constraints

- Conventional commits. **No co-author line of any kind** (user rule — overrides any default).
- No new dependencies.
- All entrance animation is CSS with `both` fill — the result page must be fully visible without hydration. No `motion/react` in the new pair components (they are server components).
- Every new animation gets a `prefers-reduced-motion: reduce` override in the existing block at the bottom of `globals.css`.
- New user-facing strings go in `content.ts` under `compatibilityTest`, never inline in components.
- Focus states: `outline: 3px solid color-mix(in srgb, var(--color-signal) 70%, white); outline-offset: 3px` (the existing convention).
- User-typed names must never widen layout: keep `overflow-wrap: anywhere` on anything rendering a name.
- Tests: `bun test` from repo root; assertions via `renderToStaticMarkup` string containment, matching the existing style. Escape apostrophes in expected copy as `&#x27;` (see existing tests).
- Dev servers for visual checks: `bun run dev` (port 3000) and `cd ../weft_core && uvicorn weft.api:app --port 8000`.

---

### Task 1: Trait-row pairing and shared-key helpers

**Files:**
- Modify: `lib/pairView.ts`
- Test: `lib/pairView.test.ts` (exists — add to it)

**Interfaces:**
- Consumes: `PairPerson`, `TraitLabels`, `UNMEASURED` (already in `lib/pairView.ts`).
- Produces:
  - `type TraitRow = { label: string; left: string | null; right: string | null }`
  - `pairTraitRows(people: readonly [PairPerson, PairPerson], labels: TraitLabels): TraitRow[]` — one row per measured dimension, `null` on an unmeasured side, row omitted when both sides unmeasured.
  - `sharedTopValueKeys(people: readonly [PairPerson, PairPerson]): Set<string>` — keys present in both people's `top_values`.

- [ ] **Step 1: Write the failing tests** (append to `lib/pairView.test.ts`)

```ts
import { pairTraitRows, sharedTopValueKeys } from "./pairView";
import type { PairPerson } from "@/lib/weftTypes";

const LABELS = { humour: "Humour", opensUp: "Opens up", pace: "Pace", lifeStage: "Life stage" };

const VALUE = { key: "BE", name: "Benevolence", tagline: "care up close", blurb: "b" };
const OTHER = { key: "TR", name: "Tradition", tagline: "continuity", blurb: "b" };

function person(overrides: Partial<PairPerson>): PairPerson {
  return {
    name: "P",
    top_values: [VALUE],
    humour: "warm/affiliative",
    opens_up: "opens up quickly",
    pace: "likes a steady rhythm",
    life_stage: "rooting",
    ...overrides,
  };
}

test("pairTraitRows pairs both people's phrasing per dimension, in label order", () => {
  const rows = pairTraitRows([person({}), person({ pace: "likes space between" })], LABELS);
  expect(rows.map((r) => r.label)).toEqual(["Humour", "Opens up", "Pace", "Life stage"]);
  expect(rows[2]).toEqual({ label: "Pace", left: "likes a steady rhythm", right: "likes space between" });
});

test("a dimension unmeasured on one side is null there, not dropped", () => {
  const rows = pairTraitRows([person({}), person({ humour: "—" })], LABELS);
  expect(rows[0]).toEqual({ label: "Humour", left: "warm/affiliative", right: null });
});

test("a dimension unmeasured on both sides is omitted entirely", () => {
  const rows = pairTraitRows([person({ humour: "—" }), person({ humour: "unspecified" })], LABELS);
  expect(rows.map((r) => r.label)).not.toContain("Humour");
});

test("sharedTopValueKeys is the intersection of both value lists", () => {
  const keys = sharedTopValueKeys([person({ top_values: [VALUE, OTHER] }), person({ top_values: [VALUE] })]);
  expect(keys.has("BE")).toBe(true);
  expect(keys.has("TR")).toBe(false);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test lib/pairView.test.ts`
Expected: FAIL — `pairTraitRows` is not exported.

- [ ] **Step 3: Implement** (append to `lib/pairView.ts`, below `personTraits`)

```ts
export type TraitRow = { label: string; left: string | null; right: string | null };

/**
 * One row per trait dimension, both people's phrasing side by side. An
 * unmeasured side is null (the view prints a dash); a dimension neither
 * person measured is omitted -- a row of two dashes says nothing.
 */
export function pairTraitRows(
  [left, right]: readonly [PairPerson, PairPerson],
  labels: TraitLabels,
): TraitRow[] {
  const read = (person: PairPerson, pick: (p: PairPerson) => string): string | null => {
    const value = pick(person).trim();
    return UNMEASURED.has(value) ? null : value;
  };
  const dimensions: ReadonlyArray<[string, (p: PairPerson) => string]> = [
    [labels.humour, (p) => p.humour],
    [labels.opensUp, (p) => p.opens_up],
    [labels.pace, (p) => p.pace],
    [labels.lifeStage, (p) => p.life_stage],
  ];
  return dimensions
    .map(([label, pick]) => ({ label, left: read(left, pick), right: read(right, pick) }))
    .filter((row) => row.left !== null || row.right !== null);
}

/** Value keys the two people hold in common -- the crossings worth marking. */
export function sharedTopValueKeys([left, right]: readonly [PairPerson, PairPerson]): Set<string> {
  const rightKeys = new Set(right.top_values.map((value) => value.key));
  return new Set(
    left.top_values.filter((value) => rightKeys.has(value.key)).map((value) => value.key),
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun test lib/pairView.test.ts` — Expected: PASS (all, including pre-existing).

- [ ] **Step 5: Commit**

```bash
git add lib/pairView.ts lib/pairView.test.ts
git commit -m "feat: pair trait rows and shared-value keys for the head-to-head view"
```

---

### Task 2: PremiumButton — no hand marker while disabled

The disabled `Next` button's hand-glyph track (`.premium-cta-hand-track`, absolutely positioned with `inset: 0 -2.35rem`) overlaps the BACK link beside it. A disabled button also has no business promising a playful interaction.

**Files:**
- Modify: `components/ui/PremiumButton.tsx`
- Test: `components/ui/PremiumButton.test.tsx` (exists — add to it)

**Interfaces:**
- Produces: same `PremiumButton` API; when `disabled`, the markup contains no `premium-cta-hand-track`.

- [ ] **Step 1: Write the failing test** (append)

```tsx
test("a disabled button does not carry the hand marker", () => {
  const html = renderToStaticMarkup(
    <PremiumButton disabled onClick={() => {}} tone="ink">Next</PremiumButton>,
  );
  expect(html).not.toContain("premium-cta-hand-track");
  const enabled = renderToStaticMarkup(<PremiumButton onClick={() => {}}>Next</PremiumButton>);
  expect(enabled).toContain("premium-cta-hand-track");
});
```

- [ ] **Step 2: Run** `bun test components/ui/PremiumButton.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Implement** — in `PremiumButton.tsx`, wrap the hand-track span:

```tsx
{!disabled && (
  <span aria-hidden="true" className="premium-cta-hand-track">
    <span className="premium-cta-hand-marker">
      <GestureIcon className="premium-cta-hand premium-cta-hand--point" gesture="point" />
      <GestureIcon className="premium-cta-hand premium-cta-hand--peace" gesture="peace" />
    </span>
  </span>
)}
```

- [ ] **Step 4: Run** `bun test components/ui/PremiumButton.test.tsx` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/PremiumButton.tsx components/ui/PremiumButton.test.tsx
git commit -m "fix: drop the hand marker from disabled premium buttons"
```

---

### Task 3: ShareLink link-card

Replace the dashed `ctest-linkbox` in `ShareLink` with a real card: hairline border, white glass, mono URL under a small label, copy button attached inside the card. `ShareScreen` and the pair page's share section both render `ShareLink`, so they inherit this once. (The stranded-state `<a class="ctest-linkbox">` in `CompatibilityTest.tsx` keeps the old class — it is an error surface, not the share moment.)

**Files:**
- Modify: `components/compatibility/ShareLink.tsx`, `app/globals.css`, `content.ts`
- Test: `components/compatibility/ShareLink.test.tsx` (exists — update)

**Interfaces:**
- Consumes: nothing new.
- Produces: same `ShareLink({ token, secondary })` API; markup now `ctest-linkcard` containing `ctest-linkcard-label`, the URL, and the copy `PremiumButton`; `secondary` renders below the card.

- [ ] **Step 1: Add copy** — in `content.ts` under `compatibilityTest.share`, after `matchesLink`:

```ts
      linkLabel: "Your link",
```

- [ ] **Step 2: Update the test** — in `ShareLink.test.tsx`, change any `ctest-linkbox` assertion to `ctest-linkcard`, and add:

```tsx
test("the link sits in a labelled card with the copy action attached", () => {
  const html = renderToStaticMarkup(<ShareLink token="tok-1" />);
  expect(html).toContain("ctest-linkcard");
  expect(html).toContain(content.compatibilityTest.share.linkLabel);
  expect(html).not.toContain("ctest-linkbox");
});
```

Run: `bun test components/compatibility/ShareLink.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Restyle the component** — replace `ShareLink`'s returned JSX with:

```tsx
  return (
    <div className="flex w-full flex-col items-center">
      <div className="ctest-linkcard mt-7">
        <span className="ctest-linkcard-label">{copy.linkLabel}</span>
        <p className="ctest-linkcard-url">{shareUrl.replace(/^https?:\/\//, "")}</p>
        <div className="ctest-linkcard-actions">
          <PremiumButton onClick={copyLink} tone="ember">
            {copied ? copy.copied : copy.copy}
          </PremiumButton>
        </div>
      </div>
      {secondary && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">{secondary}</div>
      )}
      <p aria-live="polite" className="ctest-copied mt-4 h-4">
        {copied ? copy.announce : ""}
      </p>
    </div>
  );
```

- [ ] **Step 4: Add CSS** — in `globals.css`, directly after the `.ctest-linkbox` rule:

```css
/* The share moment proper: a real card, not a debug box. The dashed
   .ctest-linkbox stays for error surfaces only. */
.ctest-linkcard {
  display: grid;
  gap: 0.4rem;
  width: min(30rem, 100%);
  border: 1px solid rgb(18 18 18 / 10%);
  border-radius: 1.4rem;
  background: rgb(255 255 255 / 82%);
  padding: 1.15rem 1.35rem 1.25rem;
  box-shadow: var(--shadow-media);
  backdrop-filter: blur(10px);
  text-align: left;
}
.ctest-linkcard-label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink) 45%, transparent);
}
.ctest-linkcard-url {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-ink) 78%, transparent);
  word-break: break-all;
}
.ctest-linkcard-actions { margin-top: 0.85rem; }
```

- [ ] **Step 5: Run tests + eyeball**

`bun test components/compatibility` — Expected: PASS (ShareScreen tests may also pin `ctest-linkbox`; update those the same way — assert `ctest-linkcard`).
Then with dev servers up, complete a quiz run to the share screen or open the seeded pair URL and confirm the card reads as one unit.

- [ ] **Step 6: Commit**

```bash
git add components/compatibility/ShareLink.tsx components/compatibility/ShareLink.test.tsx components/compatibility/ShareScreen.test.tsx content.ts app/globals.css
git commit -m "feat: give the share link a real card instead of a dashed box"
```

---

### Task 4: Result page — ScoreHero, SharedValues, DifferencePull

Dissolve the first two cards into editorial sections and extract the score opening. `PairResultView` keeps its old people/share markup for now (Tasks 5–6 replace those); the page must render completely at every commit.

**Files:**
- Create: `components/compatibility/pair/ScoreHero.tsx`, `components/compatibility/pair/SharedValues.tsx`, `components/compatibility/pair/DifferencePull.tsx`
- Modify: `components/compatibility/PairResultView.tsx`, `app/globals.css`
- Test: `components/compatibility/PairResultView.test.tsx` (integration — sections render through it)

**Interfaces:**
- Consumes: `PairResult`, `ValueEntry`, `scorePercent` (existing), `Eyebrow`.
- Produces (server components, no `"use client"`):
  - `ScoreHero({ result }: { result: PairResult })` — the current `<header>` block, verbatim.
  - `SharedValues({ result }: { result: PairResult })` — section with rule-tick head, headline, numbered value entries or the `noShared` sentence.
  - `DifferencePull({ difference }: { difference: string })` — rule-tick head + pull-quote.
  - `SectionHead({ label }: { label: string })` in `components/compatibility/pair/SectionHead.tsx` — the rule-tick + mono-label head, used by every pair section (successor to the local `CardHead`).

- [ ] **Step 1: Create `SectionHead.tsx`**

```tsx
/** The ember rule tick + mono label that opens every result section. */
export function SectionHead({ label }: { label: string }) {
  return (
    <div className="ctest-card-head">
      <span aria-hidden className="ctest-rule" />
      <h2 className="ctest-section-label">{label}</h2>
    </div>
  );
}
```

- [ ] **Step 2: Create `ScoreHero.tsx`** — move the entire `<header>…</header>` block (eyebrow, score, gauge, band, note) out of `PairResultView.tsx` unchanged:

```tsx
import { content } from "@/content";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { scorePercent } from "@/lib/pairView";
import type { PairResult } from "@/lib/weftTypes";

/** The verdict: eyebrow, the number, the gauge it stands on, the sentence. */
export function ScoreHero({ result }: { result: PairResult }) {
  const copy = content.compatibilityTest.pair;
  const percent = scorePercent(result.score);

  return (
    <header className="flex flex-col items-center text-center">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <p className="ctest-score" aria-hidden>
        {percent}
        <span className="ctest-score-unit">%</span>
      </p>
      <div
        className="ctest-gauge"
        role="img"
        aria-label={`${copy.scoreLabel} ${copy.scoreOutOf.replace("{percent}", String(percent))}. ${result.band}`}
      >
        <div className="ctest-gauge-track">
          <span className="ctest-gauge-fill" style={{ width: `${percent}%` }} />
          <span className="ctest-gauge-ticks" aria-hidden>
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
  );
}
```

Keep the existing comment about the un-animated number when moving it.

- [ ] **Step 3: Create `SharedValues.tsx`**

```tsx
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
```

- [ ] **Step 4: Create `DifferencePull.tsx`**

```tsx
import { content } from "@/content";
import { SectionHead } from "./SectionHead";

/** The one honest sentence about friction, given room instead of a card. */
export function DifferencePull({ difference }: { difference: string }) {
  const copy = content.compatibilityTest.pair;

  return (
    <section className="ctest-section">
      <SectionHead label={copy.differenceLabel} />
      <p className="ctest-pull">{difference}</p>
    </section>
  );
}
```

- [ ] **Step 5: Recompose `PairResultView`** — replace the `<header>` block and the first two `<section className="ctest-card">` blocks with:

```tsx
<ScoreHero result={result} />
<SharedValues result={result} />
<DifferencePull difference={result.difference} />
```

Import the three; delete the now-unused local `CardHead` usage for those sections (keep `CardHead`/`ValueLine`/`PersonCard` for the people block until Task 5). Delete the `withBlurb` path from `ValueLine` only if nothing else uses it after this change — `PersonCard` still uses the no-blurb path, so keep `ValueLine` but drop its `withBlurb`/`index` branches *in Task 5*, not here.

- [ ] **Step 6: Add CSS** — in `globals.css` after the `.ctest-card` rule:

```css
/* Editorial result sections: the type is the frame. Left-aligned inside the
   centred 46rem column, so the page alternates centred verdict / set copy. */
.ctest-section { width: 100%; text-align: left; }
.ctest-section .ctest-value-blurb { max-width: 48ch; }

/* The difference, set as a pull-quote rather than boxed. */
.ctest-pull {
  max-width: 30ch;
  font-family: var(--font-display);
  font-size: clamp(1.45rem, 3vw, 1.85rem);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.22;
  text-wrap: balance;
  color: var(--color-ink);
}
.ctest-section .ctest-headline + .ctest-body { margin-top: 1.1rem; }
```

- [ ] **Step 7: Run the integration tests**

Run: `bun test components/compatibility/PairResultView.test.tsx`
Expected: PASS — all assertions are content/role based and survive the restructure. If any card-class assertion fails, update it to assert the section content instead (e.g. `expect(html).toContain("ctest-pull")` for the difference).

- [ ] **Step 8: Visual check** — dev servers up, open the seeded pair page (seeding script in Task 10, Step 2), confirm: no cards above the people block, numbered shared values, pull-quote difference.

- [ ] **Step 9: Commit**

```bash
git add components/compatibility/pair/ components/compatibility/PairResultView.tsx app/globals.css
git commit -m "feat: dissolve the result's first cards into editorial sections"
```

---

### Task 5: PeopleCompare — threads and head-to-head rows

The centerpiece: names joined by interlacing threads, per-column top values with shared ticks, one aligned row per trait dimension.

**Files:**
- Create: `components/compatibility/pair/PeopleCompare.tsx`, `components/compatibility/pair/ThreadCross.tsx`
- Modify: `components/compatibility/PairResultView.tsx`, `app/globals.css`, `content.ts`
- Test: `components/compatibility/PairResultView.test.tsx`

**Interfaces:**
- Consumes: `pairTraitRows`, `sharedTopValueKeys` (Task 1), `SectionHead` (Task 4), `personTraits` no longer used by the view.
- Produces: `PeopleCompare({ people }: { people: PairPerson[] })` — renders nothing if `people.length !== 2` (backend guarantees two; a guard beats a crash on a malformed payload).

- [ ] **Step 1: Add copy** — in `content.ts` under `compatibilityTest.pair`, after `noShared`:

```ts
      sharedTag: "Shared",
      notMeasured: "not measured",
```

- [ ] **Step 2: Update the tests** — in `PairResultView.test.tsx`, replace the `<dl>`-counting test with:

```tsx
test("a dimension neither person measured leaves no row behind", () => {
  // Ana keeps humour; make both humourless and the row must vanish.
  const [ana, ben] = RESULT.people;
  const html = renderToStaticMarkup(
    <PairResultView
      result={{ ...RESULT, people: [{ ...ana, humour: "—" }, ben] }}
      shareToken={null}
    />,
  );
  expect(html).not.toContain(content.compatibilityTest.pair.traits.humour);
  expect(html).toContain(content.compatibilityTest.pair.traits.opensUp);
});

test("a dimension one person measured shows their reading beside a dash", () => {
  // Ben's humour is "—": the row stays for Ana's sake.
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain(content.compatibilityTest.pair.traits.humour);
  expect(html).toContain("warm/affiliative");
  expect(html).toContain("ctest-compare-cell--blank");
});

test("a value both people hold is marked shared", () => {
  // Both lead with Benevolence in the fixture.
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain(content.compatibilityTest.pair.sharedTag);
});
```

Run: `bun test components/compatibility/PairResultView.test.tsx` — Expected: the three new tests FAIL (old markup), the `<dl>` test is gone.

- [ ] **Step 3: Create `ThreadCross.tsx`**

```tsx
/**
 * The ember and signal threads interlacing once -- the same two threads
 * WeaveCanvas draws across the landing page, here joining two names.
 * pathLength=1 lets the CSS draw-in animate dashoffset without measuring.
 */
export function ThreadCross() {
  return (
    <svg aria-hidden className="ctest-threads" viewBox="0 0 100 36" preserveAspectRatio="none">
      <path d="M 0 8 C 34 8, 66 28, 100 28" data-thread="ember" pathLength={1} />
      <path d="M 0 28 C 34 28, 66 8, 100 8" data-thread="signal" pathLength={1} />
    </svg>
  );
}
```

- [ ] **Step 4: Create `PeopleCompare.tsx`**

```tsx
import { content } from "@/content";
import { SectionHead } from "./SectionHead";
import { ThreadCross } from "./ThreadCross";
import { pairTraitRows, sharedTopValueKeys } from "@/lib/pairView";
import type { PairPerson, ValueEntry } from "@/lib/weftTypes";

/**
 * Both people side by side, joined where they cross. Left/right is the
 * backend's order (sender, responder); neither is "you" -- the link may have
 * been forwarded.
 */
export function PeopleCompare({ people }: { people: PairPerson[] }) {
  if (people.length !== 2) return null;
  const copy = content.compatibilityTest.pair;
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
              <dd className="ctest-compare-cell ctest-compare-cell--left">
                {row.left ?? <Blank />}
              </dd>
              <dt className="ctest-compare-label">{row.label}</dt>
              <dd className="ctest-compare-cell">{row.right ?? <Blank />}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function CompareValue({ shared, value }: { shared: boolean; value: ValueEntry }) {
  const copy = content.compatibilityTest.pair;
  return (
    <li>
      <span className="ctest-value-name">{value.name}</span>
      {shared && <span className="ctest-compare-shared"> ✓ {copy.sharedTag}</span>}
      <span className="ctest-value-tagline"> — {value.tagline}</span>
    </li>
  );
}

function Blank() {
  const copy = content.compatibilityTest.pair;
  return (
    <span className="ctest-compare-cell--blank">
      <span aria-hidden>—</span>
      <span className="sr-only">{copy.notMeasured}</span>
    </span>
  );
}
```

Note: `sr-only` is a Tailwind utility and works here.
`<dt>` after `<dd>` inside a div wrapper is valid HTML per the dl-with-div grouping spec.

- [ ] **Step 5: Recompose `PairResultView`** — replace the people `<div>` (label head + `.ctest-people` grid) with `<PeopleCompare people={result.people} />`. Delete `PersonCard`, `ValueLine`, and `CardHead` from `PairResultView.tsx` (all their remaining consumers are gone). Remove the now-unused `personTraits` import.

- [ ] **Step 6: Add CSS** — in `globals.css` after the `.ctest-pull` block:

```css
/* Two names, joined by the threads that cross between them. */
.ctest-compare-head {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.5rem);
  margin-top: 1.9rem;
}
.ctest-compare-name {
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 2.4vw, 1.6rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--color-ink);
  overflow-wrap: anywhere;
}
.ctest-compare-name--left { text-align: right; }

.ctest-threads { display: block; width: clamp(4.5rem, 9vw, 7rem); height: 2.25rem; }
.ctest-threads path {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: ctest-thread-draw 1100ms var(--ease-out-ui) 420ms both;
}
.ctest-threads path[data-thread="ember"] { stroke: var(--color-ember); opacity: 0.8; }
.ctest-threads path[data-thread="signal"] { stroke: var(--color-signal); opacity: 0.55; }
@keyframes ctest-thread-draw { to { stroke-dashoffset: 0; } }

.ctest-compare-values {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem clamp(1.5rem, 5vw, 3.5rem);
  margin-top: 1.8rem;
}
.ctest-compare-list { gap: 0.55rem; }
.ctest-compare-list--left { text-align: right; }
.ctest-compare-shared {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ember);
  white-space: nowrap;
}

/* Head-to-head rows: the label holds the centre, each phrasing meets it. */
.ctest-compare-rows {
  display: grid;
  margin: 2.1rem 0 0;
  border-top: 1px solid rgb(18 18 18 / 8%);
}
.ctest-compare-row {
  display: grid;
  grid-template-columns: 1fr minmax(5.5rem, auto) 1fr;
  gap: 1rem;
  align-items: baseline;
  padding: 0.9rem 0;
  border-bottom: 1px solid rgb(18 18 18 / 8%);
}
.ctest-compare-label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  color: color-mix(in srgb, var(--color-ink) 44%, transparent);
}
.ctest-compare-cell { margin: 0; font-size: 0.95rem; line-height: 1.5; color: var(--color-ink); }
.ctest-compare-cell--left { text-align: right; }
.ctest-compare-cell--blank { color: color-mix(in srgb, var(--color-ink) 28%, transparent); }

@media (max-width: 560px) {
  .ctest-compare-row {
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "label label" "left right";
    row-gap: 0.3rem;
  }
  .ctest-compare-row > .ctest-compare-label { grid-area: label; }
  .ctest-compare-row > .ctest-compare-cell--left { grid-area: left; }
  .ctest-compare-row > .ctest-compare-cell:last-child { grid-area: right; }
}
```

And in the `prefers-reduced-motion` block, add `.ctest-threads path` to the `animation: none` list alongside `.ctest-gauge-fill`.

- [ ] **Step 7: Run tests**

Run: `bun test components/compatibility/PairResultView.test.tsx` — Expected: PASS, including the untouched pre-existing tests ("a trait the backend could not measure is not printed" passes: `unspecified` maps to a dash, never printed).

- [ ] **Step 8: Visual check** — seeded pair page: names joined by threads, thread draw-in on load, aligned rows, shared tick on common values. Resize to phone width; rows stack label-over-cells.

- [ ] **Step 9: Commit**

```bash
git add components/compatibility/pair/ components/compatibility/PairResultView.tsx app/globals.css content.ts components/compatibility/PairResultView.test.tsx
git commit -m "feat: join the pair head-to-head under crossing threads"
```

---

### Task 6: ShareClose and the entrance rhythm

**Files:**
- Create: `components/compatibility/pair/ShareClose.tsx`
- Modify: `components/compatibility/PairResultView.tsx`, `app/globals.css`
- Test: `components/compatibility/PairResultView.test.tsx` (existing share/matches-link tests cover it)

**Interfaces:**
- Consumes: `ShareLink` (Task 3 upgrade), `PremiumButton`.
- Produces: `ShareClose({ shareToken }: { shareToken: string | null })`. **This one is a client boundary** — `ShareLink` is a client component; importing it from a server file is allowed, so `ShareClose` itself stays a server component (no directive needed).

- [ ] **Step 1: Create `ShareClose.tsx`** — move the final `<section>` (share/restart + matches link) out of `PairResultView.tsx`:

```tsx
import Link from "next/link";
import { content } from "@/content";
import { ShareLink } from "@/components/compatibility/ShareLink";
import { PremiumButton } from "@/components/ui/PremiumButton";

/** The page's only ask, after the result has been given whole. */
export function ShareClose({ shareToken }: { shareToken: string | null }) {
  const copy = content.compatibilityTest.pair;

  return (
    <section className="flex flex-col items-center text-center">
      {shareToken ? (
        <>
          <h2 className="ctest-sub-prompt">{copy.shareHeadline}</h2>
          <p className="ctest-body max-w-md text-pretty text-center">{copy.shareSub}</p>
          <ShareLink token={shareToken} />
        </>
      ) : (
        <PremiumButton href="/compatibility-test" tone="ember">
          {copy.restart}
        </PremiumButton>
      )}
      <Link
        className="mt-8 font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
        href="/compatibility-test/matches"
      >
        {copy.matchesLink}
      </Link>
    </section>
  );
}
```

Carry over the existing comments (why nobody is "you", why the matches link is unconditional) when moving the code.

- [ ] **Step 2: Final `PairResultView` composition**

```tsx
export function PairResultView({ result, shareToken }: { result: PairResult; shareToken: string | null }) {
  return (
    <CtestShell align="top">
      <div className="ctest-pair relative z-10">
        <ScoreHero result={result} />
        <SharedValues result={result} />
        <DifferencePull difference={result.difference} />
        <PeopleCompare people={result.people} />
        <ShareClose shareToken={shareToken} />
      </div>
    </CtestShell>
  );
}
```

Five children — the existing `.ctest-pair > *:nth-child(1..5)` stagger fits exactly; no CSS change needed. Verify the doc comment on `PairResultView` still tells the truth (it warns that reordering children changes delays — still true; update the list of children it names if it names any).

- [ ] **Step 3: Run the full component suite**

Run: `bun test components/` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/compatibility/pair/ShareClose.tsx components/compatibility/PairResultView.tsx
git commit -m "feat: close the result with a single composed ask"
```

---

### Task 7: Quiz polish — option letters, live pick-two counter, footer layout

**Files:**
- Modify: `components/compatibility/CompatibilityTest.tsx`, `app/globals.css`, `content.ts`, `lib/compatibility.ts`
- Test: `lib/compatibility.test.ts`

**Interfaces:**
- Produces: `pickTwoHint(chosen: number, idle: string, template: string): string` in `lib/compatibility.ts`.

- [ ] **Step 1: Write the failing test** (append to `lib/compatibility.test.ts`)

```ts
import { pickTwoHint } from "./compatibility";

test("the pick-two helper counts once picking starts", () => {
  expect(pickTwoHint(0, "Pick exactly two", "{n} of 2 picked")).toBe("Pick exactly two");
  expect(pickTwoHint(1, "Pick exactly two", "{n} of 2 picked")).toBe("1 of 2 picked");
  expect(pickTwoHint(2, "Pick exactly two", "{n} of 2 picked")).toBe("2 of 2 picked");
});
```

Run: `bun test lib/compatibility.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement** (append to `lib/compatibility.ts`)

```ts
/** The pick-two helper line: instructions until a pick lands, then a count. */
export function pickTwoHint(chosen: number, idle: string, template: string): string {
  return chosen > 0 ? template.replace("{n}", String(chosen)) : idle;
}
```

Run: `bun test lib/compatibility.test.ts` — Expected: PASS.

- [ ] **Step 3: Add copy** — in `content.ts`, `compatibilityTest.helpers`:

```ts
      pick2Count: "{n} of 2 picked",
```

- [ ] **Step 4: Wire the quiz** — in `CompatibilityTest.tsx`:

Helper line (currently the static ternary under the prompt):

```tsx
<p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink/45">
  {question.kind === "multi"
    ? pickTwoHint(
        answers[question.id]?.length ?? 0,
        data.helpers.pick2,
        data.helpers.pick2Count,
      )
    : data.helpers.single}
</p>
```

Option letters — inside the option `<button>`, before the label span:

```tsx
<span aria-hidden className="ctest-option-index">
  {String.fromCharCode(65 + optionIndex)}
</span>
```

(`optionIndex` from `question.options.map((option, optionIndex) => …)`.)

Footer — replace `className="mt-8 flex items-center gap-5"` with `className="ctest-quiz-footer"`.

Import `pickTwoHint` from `@/lib/compatibility`.

- [ ] **Step 5: Add CSS** — in `globals.css` after `.ctest-option-check`:

```css
/* The homepage's numbered-list device, worn by the options. */
.ctest-option { padding-left: 2.9rem; }
.ctest-option-index {
  position: absolute;
  top: 1.15rem;
  left: 1.15rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--color-ink) 38%, transparent);
  transition: color 180ms ease;
}
.ctest-option--on .ctest-option-index { color: var(--color-ember); }

/* A touch more lift than before -- the options are the page's only toys. */
.ctest-option:hover { transform: translate3d(0, -3px, 0); box-shadow: var(--shadow-media); }

/* Back and Next share a footer that keeps them apart -- the hand glyph
   used to overlap the back link. */
.ctest-quiz-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  margin-top: 2rem;
  min-height: 3.35rem;
}
```

- [ ] **Step 6: Verify + visual check**

Run: `bun test` (full suite) — Expected: PASS (`CompatibilityTest.test.tsx` renders the intro only; nothing pins the old classes).
Visual: click into the quiz; confirm letters, the counter flipping to "1 of 2 picked" on a pick-two, and no overlap around a disabled Next.

- [ ] **Step 7: Commit**

```bash
git add lib/compatibility.ts lib/compatibility.test.ts components/compatibility/CompatibilityTest.tsx content.ts app/globals.css
git commit -m "feat: letter the quiz options and count the pick-two as it fills"
```

---

### Task 8: Details form framing

**Files:**
- Modify: `components/compatibility/DetailsForm.tsx`, `content.ts`, `app/globals.css`
- Test: `components/compatibility/DetailsForm.test.tsx` (exists — add one)

- [ ] **Step 1: Add copy** — in `content.ts`, `compatibilityTest.details`, after `sub`:

```ts
      fieldsLabel: "Your details",
```

- [ ] **Step 2: Write the failing test** (append to `DetailsForm.test.tsx`, matching its existing render helper)

```tsx
test("the fields sit under the rule-tick label like every other section", () => {
  const html = renderToStaticMarkup(
    <DetailsForm busy={false} initialDetails={EMPTY_DETAILS} onBack={() => {}} onSubmit={() => {}} submitError={null} />,
  );
  expect(html).toContain("ctest-rule");
  expect(html).toContain(content.compatibilityTest.details.fieldsLabel);
});
```

Run: `bun test components/compatibility/DetailsForm.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Implement** — in `DetailsForm.tsx`, at the top of the `<form>`, before the first `DetailsField`:

```tsx
<div className="ctest-card-head">
  <span aria-hidden className="ctest-rule" />
  <span className="ctest-section-label">{copy.fieldsLabel}</span>
</div>
```

And in `globals.css`, after the `.ctest-form` rule:

```css
.ctest-form .ctest-card-head { margin-bottom: 0.1rem; }
```

- [ ] **Step 4: Run** `bun test components/compatibility/DetailsForm.test.tsx` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/compatibility/DetailsForm.tsx components/compatibility/DetailsForm.test.tsx content.ts app/globals.css
git commit -m "feat: frame the details form like every other section"
```

---

### Task 9: Matches page — indexes and entrance

**Files:**
- Modify: `components/compatibility/MatchCard.tsx`, `components/compatibility/MatchesView.tsx`, `app/globals.css`
- Test: `components/compatibility/MatchCard.test.tsx`, `components/compatibility/MatchesView.test.tsx`

**Interfaces:**
- Produces: `MatchCard({ pair, index }: { pair: PairSummary; index: number })` — `index` is zero-based; the card prints it one-based, zero-padded.

- [ ] **Step 1: Write the failing test** (append to `MatchCard.test.tsx`, using its existing fixture)

```tsx
test("each match wears its position as a mono index", () => {
  const html = renderToStaticMarkup(<MatchCard index={0} pair={PAIR} />);
  expect(html).toContain("ctest-match-index");
  expect(html).toContain(">01<");
});
```

(Adjust `PAIR` to the fixture name already in that file. Existing `<MatchCard pair={…} />` call sites in tests gain `index={0}`.)

Run: `bun test components/compatibility/MatchCard.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement** — `MatchCard` signature becomes `{ pair, index }: { pair: PairSummary; index: number }`; inside the `<Link>`, first child:

```tsx
<span aria-hidden className="ctest-match-index">
  {String(index + 1).padStart(2, "0")}
</span>
```

In `MatchesView.tsx`: `pairs.map((pair, index) => <MatchCard index={index} key={pair.pair_id} pair={pair} />)`.

- [ ] **Step 3: Add CSS** — in `globals.css` after `.ctest-match-link`:

```css
.ctest-match-index {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--color-ember) 70%, transparent);
}

/* Cards land the way the result's sections do. */
.ctest-matches > li { animation: ctest-reveal 560ms var(--ease-out-ui) both; }
.ctest-matches > li:nth-child(1) { animation-delay: 120ms; }
.ctest-matches > li:nth-child(2) { animation-delay: 200ms; }
.ctest-matches > li:nth-child(3) { animation-delay: 280ms; }
.ctest-matches > li:nth-child(4) { animation-delay: 360ms; }
.ctest-matches > li:nth-child(n + 5) { animation-delay: 440ms; }
```

Add `.ctest-matches > li` to the `animation: none` reduced-motion list.

- [ ] **Step 4: Run** `bun test components/compatibility/` — Expected: PASS (fix any `MatchCard` call sites missing `index`).

- [ ] **Step 5: Commit**

```bash
git add components/compatibility/MatchCard.tsx components/compatibility/MatchCard.test.tsx components/compatibility/MatchesView.tsx components/compatibility/MatchesView.test.tsx app/globals.css
git commit -m "feat: index the matches and stagger their entrance"
```

---

### Task 10: Full verification — suite, lint, build, visual pass

**Files:** none new. This task gates the branch.

- [ ] **Step 1: Full checks**

```bash
bun test && bun run lint && bun run build
```

Expected: all green. Fix anything that isn't before proceeding.

- [ ] **Step 2: Seed a pair and screenshot every screen**

With both dev servers running, seed (answers format: `{Qid: optionIndex}`, pick2 as `[i, j]`):

```bash
python3 - <<'EOF'
import json, urllib.request
qs = json.load(open('lib/compatibility-questions.json'))['questions']
def answers(seed):
    out = {}
    for i, q in enumerate(qs):
        n = len(q['options'])
        out[q['id']] = [(seed+i) % n, ((seed+i) % n + 1) % n] if q['kind'] == 'pick2' else (seed+i) % n
    return out
def post(p):
    req = urllib.request.Request('http://localhost:3000/api/answers', data=json.dumps(p).encode(), headers={'Content-Type':'application/json'})
    return json.load(urllib.request.urlopen(req))
a = post({'name':'Maya','email':'maya@example.com','phone':'+31612345678','answers':answers(0)})
b = post({'name':'Jonas','email':'jonas@example.com','phone':'+31687654321','answers':answers(2),'invite_token':a['share_token']})
print('pair url: /compatibility-test/pair/%s?share=%s' % (b['pair_id'], b['share_token']))
EOF
```

Screenshot with headless Chrome at 1440px and 390px widths: `/` (reference), `/compatibility-test`, the printed pair URL, `/compatibility-test/matches`:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,3200 --virtual-time-budget=15000 --screenshot=/tmp/pair-desktop.png "http://localhost:3000<PAIR_URL>"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=390,3600 --virtual-time-budget=15000 --screenshot=/tmp/pair-mobile.png "http://localhost:3000<PAIR_URL>"
```

Read each screenshot and judge against the spec: editorial sections not cards, threads crossing between names, aligned rows, link card, quiz letters, no footer collision, mobile stacking. Fix what falls short; re-shoot until it holds.

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "polish: settle the compatibility flow against the redesign spec"  # only if fixes were made
git push
```

---

## Self-review notes

- Spec coverage: ScoreHero (T4), SharedValues (T4), DifferencePull (T4), PeopleCompare + threads + rows + shared ticks + em-dash (T1, T5), ShareClose + link card (T3, T6), entrance stagger (T6 — five children, existing CSS), quiz letters + counter + collision fix (T2, T7), details form (T8), matches (T9), reduced-motion (T5, T9), tests updated where markup was pinned (T3 ShareScreen, T5 dl test, T9 MatchCard call sites).
- The stranded-state linkbox deliberately keeps the dashed style (T3 note) — error surface, not the share moment.
