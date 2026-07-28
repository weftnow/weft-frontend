# Questionnaire Intro Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the questionnaire intro around compatibility with a specific person and place a larger Weft mark precisely on the thread crossing directly below the headline.

**Architecture:** Keep copy in the existing content catalog and keep the decorative motif in `QuestionnaireWeave`. Add one intro-only layout slot so the absolute weave has reserved space between the headline and supporting paragraph, then use intro-specific CSS to position and scale the motif without changing question or details layouts.

**Tech Stack:** Next.js 16.2.11, React 19.2.4, CSS, Bun test runner

## Global Constraints

- Use the exact headline lines `How compatible are you` and `with that person?`.
- Keep the mark centered on the threads' visual crossing point.
- Keep all animation, question behavior, details behavior, results, and backend integration unchanged.
- Use Bun for every test, lint, build, and development command.

---

### Task 1: Refine the questionnaire intro

**Files:**
- Modify: `content.test.ts`
- Modify: `components/compatibility/CompatibilityTest.test.tsx`
- Modify: `content.ts`
- Modify: `components/compatibility/CompatibilityTest.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `content.compatibilityTest.intro.headline` as a readonly list of display lines.
- Produces: `.ctest-intro-weave-space`, an intro-only reserved layout gap positioned between the headline and supporting paragraph.

- [ ] **Step 1: Write failing copy and hierarchy tests**

```tsx
expect(content.compatibilityTest.intro.headline).toEqual([
  "How compatible are you",
  "with that person?",
]);

expect(html.indexOf("ctest-prompt")).toBeLessThan(
  html.indexOf("ctest-intro-weave-space"),
);
expect(html.indexOf("ctest-intro-weave-space")).toBeLessThan(
  html.indexOf("Twenty questions"),
);
```

- [ ] **Step 2: Run the targeted tests and verify RED**

Run:

```bash
rtk bun test content.test.ts components/compatibility/CompatibilityTest.test.tsx
```

Expected: FAIL because the old headline remains and no intro motif gap is rendered.

- [ ] **Step 3: Implement the minimal intro changes**

Set the content lines to:

```ts
headline: ["How compatible are you", "with that person?"],
```

Render the reserved slot directly after the intro `<h1>`:

```tsx
<span aria-hidden className="ctest-intro-weave-space" />
```

Style the slot and intro weave so the motif occupies that space, enlarge the
mark, and align its center to the actual path intersection:

```css
.ctest-intro-weave-space {
  display: block;
  height: clamp(6.5rem, 11vh, 8rem);
}

.ctest-shell:has(.ctest-stage--intro) .ctest-weave {
  top: 54%;
}

.ctest-shell:has(.ctest-stage--intro) .ctest-weave-mark {
  top: 58%;
  width: 3.75rem;
  height: 3.75rem;
}

.ctest-shell:has(.ctest-stage--intro) .ctest-weave-mark img {
  width: 2.75rem;
  height: 2.75rem;
}
```

Calibrate the final percentage values during browser QA so the mark center
matches the real path intersection and the motif remains below the headline.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run:

```bash
rtk bun test content.test.ts components/compatibility/CompatibilityTest.test.tsx
```

Expected: all targeted tests pass.

- [ ] **Step 5: Verify the live layout**

Use the existing Bun server at `http://localhost:3010/compatibility-test`.
Confirm the headline wraps into exactly two lines, the enlarged mark is centered
on the thread crossing, and no thread overlaps the headline, paragraph, or CTA.

- [ ] **Step 6: Run complete verification**

Run:

```bash
rtk bun test
rtk bun run lint
rtk bun run build
rtk git diff --check
```

Expected: tests and build pass, lint has no new errors, and the diff check is clean.

- [ ] **Step 7: Commit**

```bash
rtk git add content.test.ts components/compatibility/CompatibilityTest.test.tsx content.ts components/compatibility/CompatibilityTest.tsx app/globals.css
rtk git commit -m "refactor(questionnaire): clarify intro purpose"
```
