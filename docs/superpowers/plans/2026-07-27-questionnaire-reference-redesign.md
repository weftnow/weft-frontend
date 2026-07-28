# Questionnaire Reference Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the compatibility-test intro, quiz, and details form to match the supplied responsive references while preserving the existing backend contract and single-choice auto-advance behavior.

**Architecture:** Keep `CompatibilityTest` as the stateful client boundary and extract three presentation-only units: a CSS-animated weave motif, a progress unit, and an option card. `CtestShell` receives an opt-in weave flag so unrelated result/matches screens remain unchanged; existing `ctest-*` global styles are revised in place because `app/globals.css` is already the compatibility UI's established styling surface.

**Tech Stack:** Next.js 16.2.11 App Router, React 19.2.4, TypeScript, Motion 12, Tailwind CSS 4 plus existing global CSS, Bun tests, repository-native SVG.

## Global Constraints

- Do not modify `weft-core`, question scoring, bank schema, or API payloads.
- Apply the redesign only to the intro, question screens, and final details form.
- Do not add the marketing navbar; preserve the existing `← Weft` home control.
- Use a continuous progress rail based on the actual served question count.
- Use neutral letter markers; do not derive visuals from hidden scoring dimensions.
- Preserve single-choice auto-advance and multi-choice explicit Next behavior.
- Back must precede and sit immediately left of Next when both appear.
- Use no new runtime dependency.
- Respect `prefers-reduced-motion: reduce`.
- Read relevant local Next.js documentation before code changes; the applicable guides are `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` and `11-css.md`.

---

### Task 1: Opt-in Questionnaire Weave

**Files:**
- Create: `components/compatibility/QuestionnaireWeave.tsx`
- Create: `components/compatibility/CtestShell.test.tsx`
- Modify: `components/compatibility/CtestShell.tsx`

**Interfaces:**
- Consumes: existing `/icon.svg` Weft mark and `ReactNode`.
- Produces: `QuestionnaireWeave(): JSX.Element`; `CtestShell({ children, align?, showWeave? })`, where `showWeave` defaults to `false`.

- [ ] **Step 1: Write the failing shell tests**

Add tests proving the shell renders decorative weave markup only when opted in:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CtestShell } from "./CtestShell";

test("questionnaire shell renders the weave only when requested", () => {
  const withWeave = renderToStaticMarkup(
    <CtestShell showWeave><p>Question</p></CtestShell>,
  );
  const withoutWeave = renderToStaticMarkup(
    <CtestShell><p>Result</p></CtestShell>,
  );

  expect(withWeave).toContain("ctest-weave");
  expect(withWeave).toContain('src="/icon.svg"');
  expect(withWeave).toContain('aria-hidden="true"');
  expect(withoutWeave).not.toContain("ctest-weave");
});

test("questionnaire shell keeps the minimal home control", () => {
  const html = renderToStaticMarkup(<CtestShell><p>Page</p></CtestShell>);
  expect(html).toContain('href="/"');
  expect(html).toContain("ctest-home");
  expect(html).not.toContain("<nav");
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `rtk bun test components/compatibility/CtestShell.test.tsx`

Expected: FAIL because `showWeave` and `QuestionnaireWeave` do not exist.

- [ ] **Step 3: Implement the decorative weave and opt-in shell prop**

Create a server-safe, static SVG component. CSS will animate the two path
groups later, so no new client boundary is needed:

```tsx
export function QuestionnaireWeave() {
  return (
    <div aria-hidden="true" className="ctest-weave">
      <svg className="ctest-weave-lines" preserveAspectRatio="none" viewBox="0 0 1200 120">
        <g className="ctest-weave-thread ctest-weave-thread--ember">
          <path d="M-80 18 C180 20 230 112 520 78 S900 22 1280 70" />
        </g>
        <g className="ctest-weave-thread ctest-weave-thread--signal">
          <path d="M-80 92 C190 110 290 28 560 70 S920 104 1280 34" />
        </g>
      </svg>
      <span className="ctest-weave-mark">
        <img alt="" height={38} src="/icon.svg" width={38} />
      </span>
    </div>
  );
}
```

Update `CtestShell`:

```tsx
export function CtestShell({
  children,
  align = "center",
  showWeave = false,
}: {
  children: ReactNode;
  align?: "center" | "top";
  showWeave?: boolean;
}) {
  return (
    <div className={`ctest-shell${align === "top" ? " ctest-shell--top" : ""}`}>
      <span aria-hidden className="ctest-ambient ctest-ambient--ember" />
      <span aria-hidden className="ctest-ambient ctest-ambient--signal" />
      <Link className="ctest-home" href="/">
        <span aria-hidden>&larr;</span> Weft
      </Link>
      {showWeave && <QuestionnaireWeave />}
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run the shell tests to verify GREEN**

Run: `rtk bun test components/compatibility/CtestShell.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add components/compatibility/QuestionnaireWeave.tsx components/compatibility/CtestShell.tsx components/compatibility/CtestShell.test.tsx
rtk git commit -m "feat(questionnaire): add opt-in weave motif"
```

### Task 2: Progress and Neutral Option Components

**Files:**
- Create: `components/compatibility/QuizProgress.tsx`
- Create: `components/compatibility/QuizProgress.test.tsx`
- Create: `components/compatibility/QuizOption.tsx`
- Create: `components/compatibility/QuizOption.test.tsx`

**Interfaces:**
- Consumes: `progressFraction(activeIndex, questionCount)` and `QuizOption` data from `lib/compatibilityQuestions.ts`.
- Produces: `QuizProgress({ activeIndex, total })`; `QuizOptionCard({ option, optionIndex, selected, kind, onChoose })`.

- [ ] **Step 1: Write failing progress tests**

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QuizProgress } from "./QuizProgress";

test("progress reports the real current step and served total", () => {
  const html = renderToStaticMarkup(<QuizProgress activeIndex={1} total={20} />);
  expect(html).toContain("2 of 20");
  expect(html).toContain('aria-valuenow="2"');
  expect(html).toContain('aria-valuemax="20"');
  expect(html).toContain("width:10%");
});

test("progress stays bounded for an empty bank", () => {
  const html = renderToStaticMarkup(<QuizProgress activeIndex={0} total={0} />);
  expect(html).toContain("0 of 0");
  expect(html).toContain("width:0%");
});
```

- [ ] **Step 2: Run the progress tests to verify RED**

Run: `rtk bun test components/compatibility/QuizProgress.test.tsx`

Expected: FAIL because `QuizProgress.tsx` does not exist.

- [ ] **Step 3: Implement the progress component**

```tsx
import { progressFraction } from "@/lib/compatibility";

export function QuizProgress({ activeIndex, total }: { activeIndex: number; total: number }) {
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
        <span className="ctest-progressbar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span aria-hidden="true" className="ctest-progress-count">{current} of {total}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run the progress tests to verify GREEN**

Run: `rtk bun test components/compatibility/QuizProgress.test.tsx`

Expected: PASS.

- [ ] **Step 5: Write failing option-card tests**

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QuizOptionCard } from "./QuizOption";

const option = { id: "Q1-5", label: "My routines" };

test("option card renders a neutral marker beyond four answers", () => {
  const html = renderToStaticMarkup(
    <QuizOptionCard kind="multi" onChoose={() => {}} option={option} optionIndex={5} selected={false} />,
  );
  expect(html).toContain(">F<");
  expect(html).toContain("My routines");
  expect(html).toContain('role="checkbox"');
  expect(html).toContain('aria-checked="false"');
});

test("selected option exposes its real checked state", () => {
  const html = renderToStaticMarkup(
    <QuizOptionCard kind="single" onChoose={() => {}} option={option} optionIndex={0} selected />,
  );
  expect(html).toContain("ctest-option--on");
  expect(html).toContain('role="radio"');
  expect(html).toContain('aria-checked="true"');
});
```

- [ ] **Step 6: Run the option tests to verify RED**

Run: `rtk bun test components/compatibility/QuizOption.test.tsx`

Expected: FAIL because `QuizOption.tsx` does not exist.

- [ ] **Step 7: Implement the option component**

```tsx
import type { QuizOption } from "@/lib/compatibilityQuestions";

export function QuizOptionCard({
  option,
  optionIndex,
  selected,
  kind,
  onChoose,
}: {
  option: QuizOption;
  optionIndex: number;
  selected: boolean;
  kind: "single" | "multi";
  onChoose: () => void;
}) {
  const marker = String.fromCharCode(65 + optionIndex);
  return (
    <button
      aria-checked={selected}
      className={`ctest-option${selected ? " ctest-option--on" : ""}`}
      onClick={onChoose}
      role={kind === "single" ? "radio" : "checkbox"}
      type="button"
    >
      <span aria-hidden className={`ctest-option-marker ctest-option-marker--${optionIndex % 4}`}>
        {marker}
      </span>
      <span className="ctest-option-label">{option.label}</span>
      <span aria-hidden className="ctest-option-check">&#10003;</span>
    </button>
  );
}
```

- [ ] **Step 8: Run both component test files**

Run: `rtk bun test components/compatibility/QuizProgress.test.tsx components/compatibility/QuizOption.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
rtk git add components/compatibility/QuizProgress.tsx components/compatibility/QuizProgress.test.tsx components/compatibility/QuizOption.tsx components/compatibility/QuizOption.test.tsx
rtk git commit -m "feat(questionnaire): add progress and option primitives"
```

### Task 3: Integrate the Responsive Questionnaire Structure

**Files:**
- Modify: `components/compatibility/CompatibilityTest.tsx`
- Modify: `components/compatibility/CompatibilityTest.test.tsx`
- Modify: `components/compatibility/DetailsForm.tsx`
- Modify: `components/compatibility/DetailsForm.test.tsx`
- Modify: `content.ts`

**Interfaces:**
- Consumes: `QuizProgress`, `QuizOptionCard`, existing answer helpers, `CtestShell.showWeave`.
- Produces: the same public `CompatibilityTest({ questions, invite? })` and `DetailsForm` interfaces; no caller changes.

- [ ] **Step 1: Add failing integration assertions**

Extend `CompatibilityTest.test.tsx` to prove the new static intro surface is
opted into the weave and that the marketing navbar remains absent:

```tsx
test("questionnaire intro opts into the weave without adding site navigation", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain("ctest-weave");
  expect(html).not.toContain("<nav");
});
```

Extend `DetailsForm.test.tsx` to prove Back precedes the submit button in DOM
order:

```tsx
test("details actions keep Back before the primary submit action", () => {
  const html = renderToStaticMarkup(
    <DetailsForm
      busy={false}
      initialDetails={EMPTY_DETAILS}
      onBack={() => {}}
      onSubmit={() => {}}
      submitError={null}
    />,
  );
  expect(html.indexOf(content.compatibilityTest.details.back))
    .toBeLessThan(html.indexOf(`aria-label="${content.compatibilityTest.details.cta}`));
});
```

- [ ] **Step 2: Run integration tests to verify RED**

Run: `rtk bun test components/compatibility/CompatibilityTest.test.tsx components/compatibility/DetailsForm.test.tsx`

Expected: FAIL because the shell is not opted into the weave and the new shared action markup is absent.

- [ ] **Step 3: Integrate extracted components and approved copy**

In `CompatibilityTest.tsx`:

- import `QuizProgress` and `QuizOptionCard`;
- replace the inline progress rail/count with `<QuizProgress activeIndex={activeIndex} total={questions.length} />`;
- render `data.quiz.eyebrow` above the prompt;
- replace inline answer buttons with `QuizOptionCard`;
- set `showWeave={phase === "intro" || phase === "quiz" || phase === "details"}` on `CtestShell`;
- add stage classes (`ctest-stage`, `ctest-stage--intro`, `ctest-stage--quiz`) rather than changing phase logic;
- keep `choose`, `advance`, and `goBack` byte-for-byte behaviorally equivalent;
- render the existing Back button before the multi-choice `PremiumButton`;
- use `tone="ember"` and `hand={false}` for the questionnaire Next button.

In `content.ts`, use presentation copy that matches the approved hierarchy:

```ts
quiz: {
  eyebrow: "About you",
  progress: "{n} of {total}",
  back: "Back",
  next: "Next question",
},
```

Do not change invite copy, backend option labels, field labels, or submission
messages.

In `DetailsForm.tsx`, add `ctest-stage ctest-stage--details` to the root and
replace the generic action utility row with:

```tsx
<div className="ctest-actions ctest-actions--details">
  <button className="ctest-back" onClick={onBack} type="button">
    <span aria-hidden>&larr;</span> {copy.back}
  </button>
  <PremiumButton hand={false} tone="ember" type="submit" disabled={busy}>
    {copy.cta}
  </PremiumButton>
</div>
```

- [ ] **Step 4: Run targeted integration tests to verify GREEN**

Run: `rtk bun test components/compatibility/CompatibilityTest.test.tsx components/compatibility/DetailsForm.test.tsx components/compatibility/QuizProgress.test.tsx components/compatibility/QuizOption.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run content and compatibility logic regressions**

Run: `rtk bun test content.test.ts lib/compatibility.test.ts lib/compatibilityQuestions.test.ts`

Expected: PASS; update only content assertions that intentionally expect the
old `quiz` key set or the old Next label.

- [ ] **Step 6: Commit**

```bash
rtk git add components/compatibility/CompatibilityTest.tsx components/compatibility/CompatibilityTest.test.tsx components/compatibility/DetailsForm.tsx components/compatibility/DetailsForm.test.tsx content.ts content.test.ts
rtk git commit -m "feat(questionnaire): integrate reference layout"
```

### Task 4: Responsive Styling and Motion

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: the `ctest-weave*`, `ctest-stage*`, `ctest-progress*`, `ctest-option*`, `ctest-actions*`, and `ctest-back` class names produced by Tasks 1–3.
- Produces: responsive desktop/mobile presentation with no markup or API changes.

- [ ] **Step 1: Establish shell and stage geometry**

Revise the existing `ctest-*` block in `app/globals.css`:

```css
.ctest-shell {
  min-height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  background: #fbfaf8;
  padding: clamp(5.5rem, 8vh, 7rem) clamp(1.25rem, 4vw, 3rem) clamp(2.5rem, 6vh, 4.5rem);
}

.ctest-stage {
  position: relative;
  z-index: 2;
  display: flex;
  width: min(68rem, 100%);
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.ctest-stage--intro,
.ctest-stage--details {
  width: min(34rem, 100%);
}
```

Keep `ctest-shell--top` behavior for unrelated scroll-first result pages.

- [ ] **Step 2: Style the continuous weave**

```css
.ctest-weave {
  position: absolute;
  z-index: 1;
  top: clamp(20rem, 43vh, 27rem);
  left: 50%;
  width: max(100vw, 90rem);
  height: 8rem;
  translate: -50% 0;
  pointer-events: none;
}

.ctest-weave-lines { width: 100%; height: 100%; overflow: visible; }
.ctest-weave-thread path {
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.ctest-weave-thread--ember { stroke: rgb(244 81 30 / 34%); animation: ctest-thread-drift-a 14s ease-in-out infinite alternate; }
.ctest-weave-thread--signal { stroke: rgb(0 144 222 / 24%); animation: ctest-thread-drift-b 17s ease-in-out infinite alternate; }
.ctest-weave-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border-radius: 999px;
  background: #fbfaf8;
  translate: -50% -50%;
}

@keyframes ctest-thread-drift-a {
  to { transform: translate3d(3.5rem, 0.35rem, 0) scaleY(1.04); }
}
@keyframes ctest-thread-drift-b {
  to { transform: translate3d(-4rem, -0.3rem, 0) scaleY(0.96); }
}
```

- [ ] **Step 3: Style progress, cards, and action order**

Use a `minmax(0, 1fr)` two-column grid above `720px`, one column below it,
and card geometry that supports long live question labels:

```css
.ctest-progress {
  display: grid;
  width: min(44rem, 100%);
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 1rem;
}
.ctest-progressbar { width: 100%; margin: 0; }
.ctest-progress-count {
  min-width: 4.5rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: rgb(18 18 18 / 54%);
}
.ctest-grid {
  width: min(58rem, 100%);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}
.ctest-option {
  min-height: 7rem;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  padding: 1.15rem 4rem 1.15rem 1.25rem;
}
.ctest-option-marker {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
.ctest-option-marker--0 { background: #fff0e9; color: #d94818; }
.ctest-option-marker--1 { background: #edf3fb; color: #3869a6; }
.ctest-option-marker--2 { background: #eff6eb; color: #397a31; }
.ctest-option-marker--3 { background: #f4f0f8; color: #72588d; }
.ctest-option-label { text-align: left; }
.ctest-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
```

Remove obsolete `.ctest-option-index` rules. Preserve checked, focus-visible,
error, and disabled selectors.

- [ ] **Step 4: Add mobile and reduced-motion rules**

```css
@media (max-width: 719px) {
  .ctest-shell {
    justify-content: flex-start;
    padding: 5.25rem 1.15rem 2.25rem;
  }
  .ctest-weave {
    top: 24rem;
    width: 78rem;
  }
  .ctest-grid {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
  .ctest-option {
    min-height: 6.2rem;
    border-radius: 1.25rem;
  }
  .ctest-actions {
    width: 100%;
  }
  .ctest-actions .premium-cta-cluster {
    flex: 1;
  }
  .ctest-actions .premium-cta {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ctest-weave-thread--ember,
  .ctest-weave-thread--signal {
    animation: none;
  }
  .ctest-progressbar-fill,
  .ctest-option {
    transition-duration: 0.01ms;
  }
}
```

- [ ] **Step 5: Run code-quality verification**

Run:

```bash
rtk bun test
rtk npm run lint
rtk npm run build
```

Expected: all tests pass; lint and production build exit 0 without new errors.

- [ ] **Step 6: Commit**

```bash
rtk git add app/globals.css
rtk git commit -m "style(questionnaire): match responsive reference"
```

### Task 5: Browser QA and Final Corrections

**Files:**
- Modify if required by observed defects: `app/globals.css`
- Modify if required by observed defects: `components/compatibility/CompatibilityTest.tsx`
- Modify if required by observed defects: `components/compatibility/DetailsForm.tsx`
- Modify matching tests before any behavioral correction.

**Interfaces:**
- Consumes: completed questionnaire route `/compatibility-test`.
- Produces: visually verified responsive implementation.

- [ ] **Step 1: Start the local app**

Run: `rtk npm run dev`

Expected: Next.js reports a local URL and the process stays running.

- [ ] **Step 2: Inspect representative desktop and mobile sizes**

Use the browser skill against:

- desktop: `1536 × 1024`;
- small laptop: `1280 × 800`;
- mobile: `390 × 844`.

At each size verify:

- no marketing navbar appears;
- the existing `← Weft` home control remains readable;
- intro, first question, a multi-choice question, and details form do not clip;
- the weave crosses an empty band and its mark is centered;
- progress uses the actual served total;
- desktop cards use two columns and mobile cards use one;
- long answer labels wrap without crossing the marker or check;
- Back is immediately left of Next where Next exists;
- mobile pages scroll naturally on short viewports.

- [ ] **Step 3: Verify interactions and accessibility**

In the browser:

- select a single-choice answer and confirm automatic advancement;
- go Back and confirm the answer remains selected;
- reach a multi-choice question and confirm Next remains disabled until the required count is selected;
- tab through options and actions to confirm focus visibility and reading order;
- emulate reduced motion and confirm thread drift and nonessential transitions stop.

- [ ] **Step 4: Correct any observed defect test-first**

For a behavioral defect, add the smallest failing Bun test that names the
break, run it to verify RED, implement the correction, and run it to GREEN.
For a visual-only defect, adjust the relevant existing `ctest-*` rule and
repeat the exact viewport inspection that exposed it.

- [ ] **Step 5: Run final verification**

Run:

```bash
rtk bun test
rtk npm run lint
rtk npm run build
rtk git diff --check
rtk git status --short
```

Expected: tests, lint, build, and diff check pass; status shows only intentional
changes, or is clean if the corrections were committed.

- [ ] **Step 6: Commit QA corrections if any**

```bash
rtk git add app/globals.css components/compatibility/CompatibilityTest.tsx components/compatibility/CompatibilityTest.test.tsx components/compatibility/DetailsForm.tsx components/compatibility/DetailsForm.test.tsx
rtk git commit -m "fix(questionnaire): polish responsive flow"
```
