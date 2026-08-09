# Fast Questions Visual Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every participant portrait circular and show an ember marker at the timer arc endpoint.

**Architecture:** CSS owns a responsive square avatar frame and its clipping boundary. `CircularTimer` derives the SVG endpoint marker from the existing normalized countdown progress, keeping marker and stroke synchronized without introducing timer state.

**Tech Stack:** Next.js 16.2.11, React 19, TypeScript 5, CSS Modules, Bun test.

## Global Constraints

- Preserve the Fast Questions route, session contract, and timestamp-driven timer behavior.
- Reuse the existing `--color-ember` visual token.
- Add no dependencies.
- Follow TDD: focused failing test, expected RED, minimal implementation, GREEN.

---

### Task 1: Repair portrait geometry and timer endpoint marker

**Files:**
- Modify: `src/features/conversation/fastQuestions/components/FastQuestions.module.css`
- Modify: `src/features/conversation/fastQuestions/components/CircularTimer.tsx`
- Modify: `src/features/conversation/fastQuestions/components/CircularTimer.module.css`
- Modify: `src/features/conversation/fastQuestions/components/FastQuestions.layout.test.ts`
- Modify: `src/features/conversation/fastQuestions/components/CircularTimer.test.tsx`

**Interfaces:**
- Consumes: `CircularTimerProps` unchanged.
- Produces: a clipped square `avatarFrame` and a `data-progress-marker` SVG circle synchronized to `data-progress`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(styles).toMatch(/height:\s*var\(--avatar-size\)/);
expect(styles).toMatch(/overflow:\s*hidden/);
expect(html).toContain('data-progress-marker="true"');
```

- [ ] **Step 2: Run tests to verify RED**

Run: `rtk bun test src/features/conversation/fastQuestions/components/FastQuestions.layout.test.ts src/features/conversation/fastQuestions/components/CircularTimer.test.tsx`

Expected: FAIL because neither the strict square-frame contract nor the marker exists.

- [ ] **Step 3: Write the minimal implementation**

```css
.avatarFrame {
  --avatar-size: clamp(3rem, 13vw, 4.5rem);
  width: var(--avatar-size);
  height: var(--avatar-size);
  overflow: hidden;
}
```

```tsx
<circle className={styles.endpoint} data-progress-marker="true" fill="currentColor" />
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `rtk bun test src/features/conversation/fastQuestions/components/FastQuestions.layout.test.ts src/features/conversation/fastQuestions/components/CircularTimer.test.tsx`

Expected: PASS.

- [ ] **Step 5: Verify in Chrome and commit**

Run: `rtk tsc && rtk test bun test && rtk bun run lint && rtk proxy git diff --check`

Verify the 390×844 conversation shows a circular Antonio avatar and an ember endpoint marker on the timer. Commit only the files above and these approved spec/plan files with message `fix(conversation): repair avatar and timer endpoint geometry`.
