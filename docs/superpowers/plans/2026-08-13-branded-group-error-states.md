# Branded Group Error States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distinguish missing attendee sessions from temporary group-service failures and render both as localized, branded Weft questionnaire states.

**Architecture:** Preserve the group route and backend contract. Parse the existing route error code into a typed client error, carry that error kind through the polling hook, and render a focused branded error component from the group screen while leaving waiting, countdown, reveal, confirmation, and polling behavior intact.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Tailwind CSS 4, CSS Modules, Bun test, JSDOM.

## Global Constraints

- Reuse `questionnaire-shell questionnaire-state`, `/icon.svg`, and the existing questionnaire typography, color, texture, spacing, focus, and responsive language.
- Support English and Spanish with identical message keys.
- Treat only `401` plus `no_session` as a missing attendee session; map malformed, timed-out, network, unknown, and other non-success responses to `unavailable`.
- Preserve `204` as the branded waiting state.
- Preserve polling cadence, retry backoff, timeout values, countdown, confirmation, reveal, and conversation navigation.
- Expose no attendee credential, raw backend detail, or status code in UI copy.
- Add no dependencies.

---

## File Structure

- `src/features/groupReveal/api/groupReveal.api.ts` — owns the typed group-load error boundary and response parsing.
- `src/features/groupReveal/api/groupReveal.api.test.ts` — proves upstream route failures map to the correct safe client error kind.
- `src/features/groupReveal/hooks/useGroupReveal.ts` — stores the typed error kind and clears it after a successful poll.
- `src/features/groupReveal/hooks/useGroupReveal.mount.tsx` — exposes the error kind to hook integration tests.
- `src/features/groupReveal/hooks/useGroupReveal.test.tsx` — proves the hook preserves and clears typed errors.
- `src/features/groupReveal/i18n/groupReveal.messages.ts` — owns localized missing-session and temporary-failure copy.
- `src/features/groupReveal/components/GroupRevealError.tsx` — owns the branded error-state composition and recovery action.
- `src/features/groupReveal/components/GroupRevealScreen.tsx` — selects the error presentation and supplies route navigation.
- `src/features/groupReveal/components/GroupRevealScreen.test.tsx` — proves both errors render branded, specific, actionable states.
- `src/features/groupReveal/components/GroupReveal.module.css` — remains responsible for group-only reveal styles; obsolete plain error button styling is removed if no longer consumed.

---

### Task 1: Typed group-load failures

**Files:**
- Modify: `src/features/groupReveal/api/groupReveal.api.test.ts`
- Modify: `src/features/groupReveal/api/groupReveal.api.ts`

**Interfaces:**
- Consumes: route responses shaped as `{ code?: unknown }`.
- Produces: `GroupRevealLoadErrorKind = "no_session" | "unavailable"` and `GroupRevealLoadError` with readonly `kind: GroupRevealLoadErrorKind`.
- Preserves: `GroupRevealClient.load(formToken)` waiting/ready return contract.

- [ ] **Step 1: Write failing client error-mapping tests**

Add tests which replace `globalThis.fetch`, call `groupRevealClient.load`, catch the rejection, and assert:

```ts
expect(error).toBeInstanceOf(GroupRevealLoadError);
expect((error as GroupRevealLoadError).kind).toBe("no_session");
```

for `Response.json({ code: "no_session" }, { status: 401 })`, and:

```ts
expect((error as GroupRevealLoadError).kind).toBe("unavailable");
```

for `503`, malformed `401`, and a rejected fetch.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `rtk bun test src/features/groupReveal/api/groupReveal.api.test.ts`

Expected: FAIL because `GroupRevealLoadError` does not exist and all non-OK responses currently throw an untyped `Error`.

- [ ] **Step 3: Implement the minimal typed error boundary**

In `groupReveal.api.ts`, add:

```ts
export type GroupRevealLoadErrorKind = "no_session" | "unavailable";

export class GroupRevealLoadError extends Error {
  constructor(readonly kind: GroupRevealLoadErrorKind) {
    super(kind);
    this.name = "GroupRevealLoadError";
  }
}
```

Add a private safe JSON reader that returns `no_session` only when both the HTTP status is `401` and the parsed body code is exactly `no_session`; otherwise return `unavailable`. Wrap fetch/network failures so every load rejection is a `GroupRevealLoadError`, while allowing `204` and valid `200` responses through the existing schema parser.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `rtk bun test src/features/groupReveal/api/groupReveal.api.test.ts`

Expected: all tests pass.

- [ ] **Step 5: Commit the typed API boundary**

```bash
rtk git add src/features/groupReveal/api/groupReveal.api.ts src/features/groupReveal/api/groupReveal.api.test.ts
rtk git commit -m "fix(group-reveal): distinguish group load failures"
```

---

### Task 2: Preserve typed errors through polling

**Files:**
- Modify: `src/features/groupReveal/hooks/useGroupReveal.mount.tsx`
- Modify: `src/features/groupReveal/hooks/useGroupReveal.test.tsx`
- Modify: `src/features/groupReveal/hooks/useGroupReveal.ts`

**Interfaces:**
- Consumes: `GroupRevealLoadError` and `GroupRevealLoadErrorKind` from Task 1.
- Produces: `useGroupReveal(...).error: GroupRevealLoadErrorKind | null`.
- Preserves: the existing `retry`, `confirm`, `remaining`, and polling return fields.

- [ ] **Step 1: Write failing hook state tests**

Update `GroupRevealProbe` to render `state.error ?? existingStateLabel`. Add one test whose client throws `new GroupRevealLoadError("no_session")` and assert the probe renders `no_session`. Add a second test with a load sequence of typed failure then `{ status: "waiting" }`; invoke the returned retry through a small probe button and assert the error clears back to `waiting`.

- [ ] **Step 2: Run the focused hook test and verify RED**

Run: `rtk bun test src/features/groupReveal/hooks/useGroupReveal.test.tsx`

Expected: FAIL because the hook currently stores `boolean` and cannot expose or clear a typed kind.

- [ ] **Step 3: Implement typed hook state**

Change the hook state to:

```ts
const [error, setError] = useState<GroupRevealLoadErrorKind | null>(null);
```

In `load`, map caught values with:

```ts
setError(
  loadError instanceof GroupRevealLoadError
    ? loadError.kind
    : "unavailable",
);
```

Set `null` after any successful waiting or ready response. Do not change scheduling, backoff, visibility, or timeout behavior.

- [ ] **Step 4: Run the focused hook test and verify GREEN**

Run: `rtk bun test src/features/groupReveal/hooks/useGroupReveal.test.tsx`

Expected: all tests pass without React act warnings.

- [ ] **Step 5: Commit typed polling state**

```bash
rtk git add src/features/groupReveal/hooks/useGroupReveal.ts src/features/groupReveal/hooks/useGroupReveal.mount.tsx src/features/groupReveal/hooks/useGroupReveal.test.tsx
rtk git commit -m "fix(group-reveal): retain typed polling errors"
```

---

### Task 3: Localized branded error presentation

**Files:**
- Modify: `src/features/groupReveal/components/GroupRevealScreen.test.tsx`
- Modify: `src/features/groupReveal/i18n/groupReveal.messages.ts`
- Create: `src/features/groupReveal/components/GroupRevealError.tsx`
- Modify: `src/features/groupReveal/components/GroupRevealScreen.tsx`
- Modify: `src/features/groupReveal/components/GroupReveal.module.css`

**Interfaces:**
- Consumes: `error: GroupRevealLoadErrorKind | null`, localized `GroupRevealMessages`, `retry(): Promise<void>`, and `onRestartQuestionnaire(): void`.
- Produces: `GroupRevealError` with props `{ error, messages, onAction }` and a branded questionnaire-shell state.
- Preserves: `GroupRevealView` waiting, countdown, ready group, and confirmation branches.

- [ ] **Step 1: Write failing presentation tests**

Add a reusable `renderView` helper and tests for `error="unavailable"` and `error="no_session"`. Assert each output contains:

```ts
expect(html).toContain("questionnaire-shell questionnaire-state");
expect(html).toContain('src="/icon.svg"');
expect(html).toContain("Weft questionnaire");
```

For unavailable, assert a temporary-failure heading, a sentence confirming answers remain safe, and `Try again`. For missing session, assert a saved-session heading/body and `Return to questionnaire`. Assert the two headings differ.

- [ ] **Step 2: Run the presentation test and verify RED**

Run: `rtk bun test src/features/groupReveal/components/GroupRevealScreen.test.tsx`

Expected: FAIL because `error` is boolean, the copy keys do not exist, and the current error branch lacks the questionnaire shell and icon.

- [ ] **Step 3: Add localized copy with matching keys**

Replace the generic `unavailable` field with matching English/Spanish keys:

```ts
errorEyebrow
unavailableTitle
unavailableBody
retry
missingSessionTitle
missingSessionBody
restartQuestionnaire
```

Use concise copy that does not claim the group is absent. English temporary-failure body explicitly says the submitted answers are safe; Spanish carries the same meaning.

- [ ] **Step 4: Implement `GroupRevealError` and route selection**

Create `GroupRevealError.tsx` using `next/image`, `questionnaire-shell questionnaire-state`, the established centered heading/body utility classes, and a pill action matching the questionnaire Start button:

```tsx
<button
  className="mt-2 min-h-11 rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
  onClick={onAction}
  type="button"
>
  {actionLabel}
</button>
```

The decorative icon uses `alt=""` and `aria-hidden`. The copy wrapper uses `role="alert"`. In `GroupRevealScreen.tsx`, accept the typed nullable error, render `GroupRevealError`, call `retry` for unavailable, and add `onRestartQuestionnaire` which routes to `/questionnaire/${encodeURIComponent(formToken)}` for a missing session. Remove now-unused plain secondary-button CSS only if no references remain.

- [ ] **Step 5: Run presentation and localization tests and verify GREEN**

Run: `rtk bun test src/features/groupReveal/components/GroupRevealScreen.test.tsx src/features/questionnaire/i18n/questionnaire.messages.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit the branded presentation**

```bash
rtk git add src/features/groupReveal/i18n/groupReveal.messages.ts src/features/groupReveal/components/GroupRevealError.tsx src/features/groupReveal/components/GroupRevealScreen.tsx src/features/groupReveal/components/GroupRevealScreen.test.tsx src/features/groupReveal/components/GroupReveal.module.css
rtk git commit -m "feat(group-reveal): brand distinct error states"
```

---

### Task 4: Full verification and browser QA

**Files:**
- Verify only; modify production or test files only to correct failures directly caused by Tasks 1–3.

**Interfaces:**
- Consumes: the completed typed error flow and branded error component.
- Produces: verification evidence for behavior, code quality, build output, and responsive presentation.

- [ ] **Step 1: Run focused group-reveal tests**

Run: `rtk bun test src/features/groupReveal`

Expected: all group-reveal tests pass.

- [ ] **Step 2: Run the full test suite**

Run: `rtk bun test`

Expected: zero failures.

- [ ] **Step 3: Run lint, production build, and whitespace verification**

Run:

```bash
rtk bun run lint
rtk bun run build
rtk git diff --check
```

Expected: all commands exit zero.

- [ ] **Step 4: Reproduce the unavailable state in the browser**

Run the frontend on port `3001` while the configured backend at port `8000` is unavailable. Open the supplied group URL, wait for the group request to fail, and verify the DOM and screenshot contain the Weft icon, eyebrow, temporary-failure heading/body, and retry action. Verify no horizontal overflow at desktop width and at a phone viewport near `390 × 844`.

- [ ] **Step 5: Verify the missing-session presentation**

Use the component regression test as the behavior proof for `no_session`. If a safe local route fixture can return `401 no_session` without mutating user data, visually inspect that route too; otherwise do not fabricate or delete session cookies.

- [ ] **Step 6: Review the final diff against acceptance criteria**

Confirm every acceptance criterion in the design spec is represented by a passing test or browser observation. Confirm the diff contains no polling cadence, timeout, backend, or matching changes.

- [ ] **Step 7: Commit any verification-only corrections**

If verification required changes, stage only those files and commit with a focused message. If no corrections were needed, do not create an empty commit.
