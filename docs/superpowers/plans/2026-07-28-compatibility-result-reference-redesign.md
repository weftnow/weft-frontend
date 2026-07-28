# Compatibility Result Reference Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current pair-result design with the approved desktop and mobile reference treatment while rendering only real `PairResult` data and preserving the share-test flow.

**Architecture:** Keep `PairResultView` as a server-rendered composition component. Refocus `ScoreHero` on the names and circular score, introduce focused summary and evaluation components that consume the existing `pairTraitRows` helper, and keep browser-only clipboard behavior isolated inside the existing `ShareLink` client component.

**Tech Stack:** Next.js 16.2 App Router, React 19 server/client components, TypeScript, Tailwind 4 plus `app/globals.css`, Bun tests, semantic HTML, inline SVG.

## Global Constraints

- Work on branch `codex/compatibility-result-redesign`.
- Render no portraits, roles, locations, distance, personality labels, per-dimension percentages, or AI data-point claims.
- Omit the reference's match-breakdown, start-conversation, and share-match controls.
- Preserve the share-test link card when `shareToken` exists and the take-test fallback when it does not.
- Preserve `/compatibility-test/matches` navigation for direct and forwarded result links.
- Never expose the raw score or backend scoring vocabulary.
- Keep result composition server-rendered; only `ShareLink` remains a client boundary.
- Use `rtk` for every shell command.

---

### Task 1: Lock the New Result Contract in Tests and Copy

**Files:**
- Modify: `components/compatibility/PairResultView.test.tsx`
- Modify: `content.ts`

**Interfaces:**
- Consumes: existing `PairResultView({ result, shareToken })`
- Produces: copy keys `heading`, `backToMatches`, `matchLabel`, `matchSub`, `differenceSub`, `evaluationHeading`, `evaluationSub`, `evaluationValues`, and `evaluationTraits`

- [ ] **Step 1: Add failing page-contract tests**

Add these assertions to `PairResultView.test.tsx`, reusing `RESULT`:

```tsx
test("the reference result hierarchy uses only supported profile data", () => {
  const html = renderToStaticMarkup(
    <PairResultView result={RESULT} shareToken="tok-9" />,
  );

  expect(html).toContain(content.compatibilityTest.pair.heading);
  expect(html).toContain(content.compatibilityTest.pair.backToMatches);
  expect(html).toContain("ctest-result-score");
  expect(html).toContain("ctest-result-summary");
  expect(html).toContain("ctest-result-evaluation");
  expect(html).not.toContain("Match breakdown");
  expect(html).not.toContain("Start a conversation");
  expect(html).not.toContain("Share match");
});

test("the result does not invent unsupported participant metadata", () => {
  const html = renderToStaticMarkup(
    <PairResultView result={RESULT} shareToken={null} />,
  );

  for (const unsupported of [
    "Marketing Lead",
    "Product Designer",
    "New York",
    "Seoul",
    "Matched across",
    "<img",
  ]) {
    expect(html).not.toContain(unsupported);
  }
});
```

- [ ] **Step 2: Run the focused test and verify the new contract fails**

Run:

```bash
rtk bun test components/compatibility/PairResultView.test.tsx
```

Expected: FAIL because the new copy keys/classes and reference hierarchy do not exist.

- [ ] **Step 3: Add exact result-page copy**

Extend `content.compatibilityTest.pair` with:

```ts
heading: "Here's your match",
backToMatches: "Back to matches",
matchLabel: "You match on",
matchSub: "The things that bring you together.",
differenceSub: "Healthy differences to be aware of.",
evaluationHeading: "How we evaluated this match",
evaluationSub: "The qualities reflected in both of your answers.",
evaluationValues: "Beliefs, principles, and what matters most.",
evaluationTraits: {
  humour: "The way you create ease and connection.",
  opensUp: "How quickly trust and openness tend to build.",
  pace: "The rhythm and space each person prefers.",
  lifeStage: "The context shaping what matters right now.",
},
```

Change `eyebrow` to `"Compatibility result"`. Keep existing accessibility, empty-state, sharing, and trait copy keys.

- [ ] **Step 4: Run the focused test to confirm only structural assertions remain red**

Run:

```bash
rtk bun test components/compatibility/PairResultView.test.tsx
```

Expected: FAIL on the new `ctest-result-*` structure, while TypeScript/content lookups no longer fail.

- [ ] **Step 5: Commit the tested copy contract**

```bash
rtk git add content.ts components/compatibility/PairResultView.test.tsx
rtk git commit -m "test(compatibility): define reference result contract"
```

---

### Task 2: Build the Participant and Circular Score Hero

**Files:**
- Modify: `components/compatibility/pair/ScoreHero.tsx`
- Modify: `components/compatibility/PairResultView.tsx`
- Modify: `components/compatibility/PairResultView.test.tsx`

**Interfaces:**
- Consumes: `PairResult.percent`, `PairResult.band`, and the first two `PairResult.people`
- Produces: `ScoreHero({ result }: { result: PairResult })` with `.ctest-result-score` and accessible score label

- [ ] **Step 1: Add failing hero behavior assertions**

Add:

```tsx
test("the two names frame a circular score with an accessible verdict", () => {
  const html = renderToStaticMarkup(
    <PairResultView result={RESULT} shareToken={null} />,
  );

  expect(html).toContain("ctest-result-person--left");
  expect(html).toContain("ctest-result-person--right");
  expect(html).toContain("Ana");
  expect(html).toContain("Ben");
  expect(html).toContain("Fit score 52 out of 100");
  expect(html).toContain("--score:52");
  expect(html).toContain(RESULT.band);
});
```

Replace the obsolete `width:52%` and `width:10%` assertions with `--score:52` and `--score:10`.

- [ ] **Step 2: Run the focused test and verify hero assertions fail**

```bash
rtk bun test components/compatibility/PairResultView.test.tsx
```

Expected: FAIL because the current score is a horizontal gauge and names appear later in the page.

- [ ] **Step 3: Implement the semantic hero**

Reshape `ScoreHero.tsx` around this structure:

```tsx
export function ScoreHero({ result }: { result: PairResult }) {
  const copy = content.compatibilityTest.pair;
  const [left, right] = result.people;

  return (
    <header className="ctest-result-hero">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <h1 className="ctest-result-heading">{copy.heading}</h1>
      <div className="ctest-result-people">
        <h2 className="ctest-result-person ctest-result-person--left">{left?.name}</h2>
        <span aria-hidden className="ctest-result-thread"><ThreadCross /></span>
        <h2 className="ctest-result-person ctest-result-person--right">{right?.name}</h2>
      </div>
      <div
        className="ctest-result-score"
        role="img"
        aria-label={`${copy.scoreLabel} ${copy.scoreOutOf.replace("{percent}", String(result.percent))}. ${result.band}`}
        style={{ "--score": result.percent } as React.CSSProperties}
      >
        <span className="ctest-result-score-number">
          {result.percent}<span aria-hidden>%</span>
        </span>
        <span className="ctest-result-score-band">{result.band}</span>
      </div>
      <p className="ctest-note">{copy.scoreNote}</p>
    </header>
  );
}
```

Import `CSSProperties` as a type and `ThreadCross` from the pair directory. Keep `percent` unchanged because the backend already clamps the public score.

Update `PairResultView.tsx` to render a `Link` to `/compatibility-test/matches` before `ScoreHero`:

```tsx
<Link className="ctest-result-back" href="/compatibility-test/matches">
  <span aria-hidden>←</span> {copy.backToMatches}
</Link>
```

- [ ] **Step 4: Run the focused tests and verify the hero is green**

```bash
rtk bun test components/compatibility/PairResultView.test.tsx
```

Expected: hero, score, name, and matches-link assertions PASS; summary structure assertions remain FAIL.

- [ ] **Step 5: Commit the hero**

```bash
rtk git add components/compatibility/PairResultView.tsx components/compatibility/PairResultView.test.tsx components/compatibility/pair/ScoreHero.tsx
rtk git commit -m "feat(compatibility): build circular result hero"
```

---

### Task 3: Build the Match, Difference, and Evaluation Panels

**Files:**
- Create: `components/compatibility/pair/ConnectionSummary.tsx`
- Create: `components/compatibility/pair/EvaluationPanel.tsx`
- Modify: `components/compatibility/PairResultView.tsx`
- Modify: `components/compatibility/PairResultView.test.tsx`

**Interfaces:**
- Consumes: `pairTraitRows([left, right], labels)` and `PairResult.shared_values`
- Produces: `ConnectionSummary({ result })` and `EvaluationPanel({ result })`

- [ ] **Step 1: Add failing summary and evaluation tests**

Add:

```tsx
test("the summary separates shared values from measured differences", () => {
  const html = renderToStaticMarkup(
    <PairResultView result={RESULT} shareToken={null} />,
  );

  expect(html).toContain(content.compatibilityTest.pair.matchLabel);
  expect(html).toContain(content.compatibilityTest.pair.matchSub);
  expect(html).toContain(content.compatibilityTest.pair.differenceSub);
  expect(html).toContain(VALUE.name);
  expect(html).toContain(VALUE.blurb);
  expect(html).toContain(RESULT.difference);
  expect(html).toContain(content.compatibilityTest.pair.traits.pace);
});

test("evaluation lists only dimensions represented by the result", () => {
  const [ana, ben] = RESULT.people;
  const html = renderToStaticMarkup(
    <PairResultView
      result={{
        ...RESULT,
        people: [
          { ...ana, humour: "—", life_stage: "unspecified" },
          { ...ben, humour: "—", life_stage: "unspecified" },
        ],
      }}
      shareToken={null}
    />,
  );

  expect(html).toContain(content.compatibilityTest.pair.evaluationHeading);
  expect(html).toContain(content.compatibilityTest.pair.evaluationValues);
  expect(html).not.toContain(content.compatibilityTest.pair.evaluationTraits.humour);
  expect(html).not.toContain(content.compatibilityTest.pair.evaluationTraits.lifeStage);
});
```

- [ ] **Step 2: Run the focused test and verify the panel assertions fail**

```bash
rtk bun test components/compatibility/PairResultView.test.tsx
```

Expected: FAIL because neither new panel exists.

- [ ] **Step 3: Implement `ConnectionSummary`**

Use the real pair helper and semantic list markup:

```tsx
export function ConnectionSummary({ result }: { result: PairResult }) {
  const copy = content.compatibilityTest.pair;
  const pair = result.people.length === 2
    ? [result.people[0], result.people[1]] as const
    : null;
  const rows = pair ? pairTraitRows(pair, copy.traits) : [];

  return (
    <section className="ctest-result-summary" aria-label="Compatibility summary">
      <div className="ctest-result-summary-column ctest-result-summary-column--match">
        <SummaryHead tone="match" title={copy.matchLabel} body={copy.matchSub} />
        {result.shared_values.length > 0 ? (
          <ul className="ctest-result-list">
            {result.shared_values.map((value) => (
              <li className="ctest-result-list-item" key={value.key}>
                <span aria-hidden className="ctest-result-list-icon">♡</span>
                <div>
                  <h3>{value.name}</h3>
                  <p>{value.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="ctest-body">{copy.noShared}</p>}
      </div>
      <div className="ctest-result-summary-column ctest-result-summary-column--difference">
        <SummaryHead tone="difference" title={copy.differenceLabel} body={copy.differenceSub} />
        <p className="ctest-result-difference">{result.difference}</p>
        {rows.length > 0 && (
          <dl className="ctest-result-traits">
            {rows.map((row) => (
              <div className="ctest-result-trait" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.left ?? <Blank />} <span aria-hidden>·</span> {row.right ?? <Blank />}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
```

Define local `SummaryHead` and accessible `Blank` helpers in the same file. Use a green check icon for match and ember cross icon for difference through text/SVG marked `aria-hidden`.

- [ ] **Step 4: Implement `EvaluationPanel`**

Build the dynamic dimension list from the same measured rows:

```tsx
const TRAIT_DESCRIPTIONS = {
  [copy.traits.humour]: copy.evaluationTraits.humour,
  [copy.traits.opensUp]: copy.evaluationTraits.opensUp,
  [copy.traits.pace]: copy.evaluationTraits.pace,
  [copy.traits.lifeStage]: copy.evaluationTraits.lifeStage,
};

const dimensions = [
  { label: "Values", body: copy.evaluationValues },
  ...rows.map((row) => ({
    label: row.label,
    body: TRAIT_DESCRIPTIONS[row.label],
  })),
];
```

Render a `.ctest-result-evaluation` section with heading/subheading and a responsive list of dimension items. Do not render percentages, progress bars, or a match-breakdown heading.

- [ ] **Step 5: Compose the new panels and remove obsolete result blocks**

In `PairResultView.tsx`, replace `SharedValues`, `DifferencePull`, and `PeopleCompare` with:

```tsx
<ConnectionSummary result={result} />
<EvaluationPanel result={result} />
```

Leave the old files in place until imports and tests prove nothing else consumes them; deletion is not required for this redesign.

- [ ] **Step 6: Run focused tests and verify all result behavior passes**

```bash
rtk bun test components/compatibility/PairResultView.test.tsx
```

Expected: all tests PASS, including missing-trait, no-shared-value, token, matches-link, and signal-leak cases.

- [ ] **Step 7: Commit the result panels**

```bash
rtk git add components/compatibility/PairResultView.tsx components/compatibility/PairResultView.test.tsx components/compatibility/pair/ConnectionSummary.tsx components/compatibility/pair/EvaluationPanel.tsx
rtk git commit -m "feat(compatibility): add result summary panels"
```

---

### Task 4: Adapt the Closing Share-Test Panel

**Files:**
- Modify: `components/compatibility/pair/ShareClose.tsx`
- Modify: `components/compatibility/PairResultView.test.tsx`

**Interfaces:**
- Consumes: `shareToken: string | null` and existing `ShareLink`
- Produces: `.ctest-result-share` closing panel with either a live invite link or take-test fallback

- [ ] **Step 1: Add failing closing-panel assertions**

Add:

```tsx
test("the closing panel shares the test rather than the match", () => {
  const html = renderToStaticMarkup(
    <PairResultView result={RESULT} shareToken="tok-9" />,
  );

  expect(html).toContain("ctest-result-share");
  expect(html).toContain(content.compatibilityTest.pair.shareHeadline);
  expect(html).toContain("/compatibility-test/invite/tok-9");
  expect(html).not.toContain("Share match");
  expect(html).not.toContain("Start a conversation");
});
```

- [ ] **Step 2: Run the focused test and verify it fails on the panel class**

```bash
rtk bun test components/compatibility/PairResultView.test.tsx
```

Expected: FAIL because `ctest-result-share` is absent.

- [ ] **Step 3: Implement the reference-shaped closing section**

Wrap the existing behavior without changing its data flow:

```tsx
<section className="ctest-result-share">
  <div className="ctest-result-share-copy">
    <span aria-hidden className="ctest-result-share-threads">
      <ThreadCross />
    </span>
    <div>
      <h2 className="ctest-sub-prompt">{copy.shareHeadline}</h2>
      <p className="ctest-body">{copy.shareSub}</p>
    </div>
  </div>
  {shareToken ? (
    <ShareLink token={shareToken} />
  ) : (
    <PremiumButton href="/compatibility-test" tone="ember">{copy.restart}</PremiumButton>
  )}
  <Link className="ctest-result-matches-link" href="/compatibility-test/matches">
    {copy.matchesLink}
  </Link>
</section>
```

- [ ] **Step 4: Run focused pair and share-link tests**

```bash
rtk bun test components/compatibility/PairResultView.test.tsx components/compatibility/ShareLink.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the closing panel**

```bash
rtk git add components/compatibility/PairResultView.test.tsx components/compatibility/pair/ShareClose.tsx
rtk git commit -m "feat(compatibility): preserve share-test result close"
```

---

### Task 5: Translate the Approved Desktop and Mobile References into CSS

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: all `.ctest-result-*` classes from Tasks 2–4
- Produces: desktop two-column summary and mobile single-column flow at `max-width: 720px`

- [ ] **Step 1: Confirm the production structure is green before styling**

```bash
rtk bun test components/compatibility/PairResultView.test.tsx
```

Expected: PASS. This proves later visual work does not hide a structural failure.

- [ ] **Step 2: Replace obsolete result-only styling**

Remove or supersede the old `.ctest-score`, `.ctest-gauge`, `.ctest-band`, `.ctest-compare-*`, and old `.ctest-pair` result rules with a cohesive `.ctest-result-*` block.

Use these layout rules:

```css
.ctest-pair {
  display: grid;
  width: min(64rem, 100%);
  gap: clamp(1.25rem, 3vw, 2rem);
  margin-top: clamp(0.75rem, 2vh, 1.5rem);
}

.ctest-result-score {
  --score: 0;
  display: grid;
  place-items: center;
  width: clamp(10.5rem, 20vw, 13rem);
  aspect-ratio: 1;
  margin-inline: auto;
  border-radius: 50%;
  background:
    radial-gradient(circle closest-side, var(--color-bone) calc(100% - 0.48rem), transparent 0),
    conic-gradient(var(--color-ember) calc(var(--score) * 1%), rgb(255 88 42 / 24%) 0);
}

.ctest-result-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid rgb(18 18 18 / 10%);
  border-radius: 1.35rem;
  background: rgb(255 255 255 / 42%);
}

.ctest-result-summary-column {
  min-width: 0;
  padding: clamp(1.4rem, 3vw, 2.25rem);
}

.ctest-result-summary-column + .ctest-result-summary-column {
  border-left: 1px solid rgb(18 18 18 / 8%);
}
```

Implement the remaining hero, panel, icon, list, evaluation, share, focus, and reveal styles using the existing `--color-bone`, `--color-ink`, `--color-ember`, `--color-signal`, `--font-display`, `--font-mono`, and `--ease-out-ui` tokens.

- [ ] **Step 3: Add the mobile reference behavior**

At `max-width: 720px`:

```css
@media (max-width: 720px) {
  .ctest-pair { width: min(34rem, 100%); }
  .ctest-result-heading { text-align: left; }
  .ctest-result-people { grid-template-columns: 1fr 1fr; }
  .ctest-result-thread { grid-column: 1 / -1; grid-row: 2; }
  .ctest-result-score { width: 10.75rem; }
  .ctest-result-summary { grid-template-columns: 1fr; border: 0; background: transparent; gap: 0.9rem; }
  .ctest-result-summary-column { border: 1px solid rgb(18 18 18 / 10%); border-radius: 1.25rem; background: rgb(255 255 255 / 44%); }
  .ctest-result-summary-column + .ctest-result-summary-column { border-left: 1px solid rgb(18 18 18 / 10%); }
  .ctest-result-evaluation-list { grid-template-columns: 1fr; }
  .ctest-result-share { grid-template-columns: 1fr; }
}
```

Ensure the flow contains no match-breakdown section and no horizontal overflow at 320px.

- [ ] **Step 4: Preserve reduced-motion behavior**

Within the existing reduced-motion query, disable result entrance and thread-draw animations:

```css
@media (prefers-reduced-motion: reduce) {
  .ctest-pair > *,
  .ctest-threads path {
    animation: none;
  }
}
```

- [ ] **Step 5: Run lint and focused tests**

```bash
rtk bun test components/compatibility/PairResultView.test.tsx components/compatibility/ShareLink.test.tsx
rtk bun run lint
```

Expected: tests PASS and lint exits 0.

- [ ] **Step 6: Commit the responsive styling**

```bash
rtk git add app/globals.css
rtk git commit -m "style(compatibility): match result references"
```

---

### Task 6: Full Verification and Visual QA

**Files:**
- Modify only if verification reveals a defect in files already listed above

**Interfaces:**
- Consumes: complete redesigned compatibility result page
- Produces: verified branch ready for review

- [ ] **Step 1: Run the complete automated test suite**

```bash
rtk bun test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run lint**

```bash
rtk bun run lint
```

Expected: exit 0 with no errors.

- [ ] **Step 3: Run the production build**

```bash
rtk bun run build
```

Expected: Next.js production build exits 0.

- [ ] **Step 4: Inspect desktop and mobile renderings**

Start the app:

```bash
rtk bun run dev
```

Open a real pair-result route and inspect at:

- desktop: `1440 × 1100`
- mobile: `390 × 844`
- narrow mobile: `320 × 700`

Confirm:

- names, score, summary, evaluation, and share-test link follow the approved order
- no portraits or unsupported metadata appear
- match breakdown and match-sharing controls do not appear
- desktop summary is two columns
- mobile summary is stacked
- long text wraps without clipping
- no horizontal scrollbar appears
- keyboard focus is visible

- [ ] **Step 5: Re-run verification after any visual fixes**

```bash
rtk bun test
rtk bun run lint
rtk bun run build
```

Expected: all three commands exit 0.

- [ ] **Step 6: Review the final diff**

```bash
rtk git diff main...HEAD --check
rtk git status --short
```

Expected: no whitespace errors; only intentional compatibility result files and the existing untracked Serena memory are present.

