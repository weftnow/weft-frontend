# Circular Timer Marker Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the countdown marker visually attached to the animated end of the Fast Questions timer arc.

**Architecture:** The countdown remains derived from the existing once-per-second server deadline. The SVG marker is moved by the same one-second linear CSS transition as the progress circle, allowing it to interpolate between React updates rather than jumping ahead.

**Tech Stack:** React 19, TypeScript, SVG, CSS Modules, Bun test.

## Global Constraints

- Preserve the existing server-derived countdown cadence and public `CircularTimerProps` interface.
- Preserve accessibility labels, displayed time, responsive layout, and reduced-motion behavior.
- Do not add an animation loop or change route/data-fetching behavior.

---

### Task 1: Synchronize the CircularTimer marker

**Files:**
- Modify: `src/features/conversation/fastQuestions/components/CircularTimer.tsx`
- Modify: `src/features/conversation/fastQuestions/components/CircularTimer.module.css`
- Modify: `src/features/conversation/fastQuestions/components/CircularTimer.test.tsx`

**Interfaces:**
- Consumes: `CircularTimerProps` with `durationSeconds`, `remainingMilliseconds`, and `running`.
- Produces: `CircularTimer`, rendering an ember endpoint marker that transitions in lockstep with the progress arc.

- [x] **Step 1: Write the failing regression test**

Replace the marker-presence-only assertion with assertions for an SVG marker wrapper and the shared one-second linear transition contract:

```tsx
expect(html).toContain('data-progress-marker="true"');
expect(html).toContain('data-progress-marker-motion="true"');
expect(styles).toMatch(/\.progressRunning\s*\{[\s\S]*?transition:\s*stroke-dashoffset\s+1s\s+linear/);
expect(styles).toMatch(/\.endpointMotion\s*\{[\s\S]*?transition:\s*transform\s+1s\s+linear/);
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `bun test src/features/conversation/fastQuestions/components/CircularTimer.test.tsx`

Expected: FAIL because the marker motion wrapper and its transition do not exist.

- [x] **Step 3: Implement the minimal synchronized marker motion**

Render the endpoint circle inside a `<g>` with `data-progress-marker-motion="true"`. Position the circle at the top of the arc and rotate the group around the SVG center according to the normalized progress:

```tsx
<g
  className={running ? `${styles.endpointMotion} ${styles.endpointMotionRunning}` : styles.endpointMotion}
  data-progress-marker-motion="true"
  style={{ transform: `rotate(${progress * 360}deg)` }}
>
  <circle className={styles.endpoint} cx={CENTER} cy={CENTER - RADIUS} data-progress-marker="true" r={ENDPOINT_MARKER_RADIUS} />
</g>
```

Set the SVG transform origin on `.endpointMotion`, and apply `transition: transform 1s linear` in `.endpointMotionRunning`, matching `.progressRunning`.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `bun test src/features/conversation/fastQuestions/components/CircularTimer.test.tsx`

Expected: PASS.

- [x] **Step 5: Run project verification**

Run: `bun run lint`, `bun test`, and `bun run build`.

Expected: all commands exit 0.

- [x] **Step 6: Commit**

```bash
git add src/features/conversation/fastQuestions/components/CircularTimer.tsx src/features/conversation/fastQuestions/components/CircularTimer.module.css src/features/conversation/fastQuestions/components/CircularTimer.test.tsx docs/superpowers/plans/2026-08-09-circular-timer-marker-sync.md
git commit -m "fix(conversation): synchronize timer marker motion"
```
