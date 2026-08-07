# Demo B2C Screaming Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all application code under `src/` and make the existing compatibility experience an explicit `demo-b2c` vertical slice without changing URLs or runtime behavior.

**Architecture:** Next.js route modules remain thin adapters under `src/app`. Compatibility UI, rules, schemas, contracts, content, browser API calls, and server operations move under `src/features/demo-b2c`; only feature-neutral UI and HTTP infrastructure remain shared.

**Tech Stack:** Next.js 16.2.11 App Router, React 19.2.4, TypeScript 5, Bun test, ESLint 9, Tailwind CSS 4, Motion 12.

## Global Constraints

- Preserve `/`, every `/compatibility-test/**` URL, `/visual-pair-preview`, and every `/api/**` contract.
- Preserve current UI, metadata, cookies, timeouts, fallback behavior, upstream status mapping, and copy.
- Move all application code under `src/`; keep `public/`, configuration, and environment files at the repository root.
- Keep dependencies flowing `app -> features/demo-b2c -> shared components/lib`.
- Do not leave compatibility re-export shims in old locations.
- Do not create empty `hooks/` or `analytics/` directories.
- Preserve unrelated and untracked user-owned work, including the current visual-pair preview page.
- Read the bundled Next.js 16 guide at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/src-folder.md` before moving `app/`.
- Prefix every shell command segment with `rtk`, per `AGENTS.md`.

---

## File Structure Map

### Shared application shell

- `app/**` -> `src/app/**`, except `app/globals.css` -> `src/styles/globals.css`.
- `components/ui/**` -> `src/components/ui/**`.
- `components/sections/**` -> `src/components/sections/**`.
- `lib/interactions.ts` and its test -> `src/lib/interactions.ts` and its test.
- `lib/motion.ts` -> `src/lib/motion.ts`.
- Homepage portion of `content.ts` -> `src/content.ts`.

### Demo B2C feature

- `components/compatibility/**` -> `src/features/demo-b2c/components/**`.
- `lib/answers.ts`, `compatibility.ts`, `inviteText.ts`, `links.ts`, `pairView.ts`, and `submitOutcome.ts`, with their tests -> `src/features/demo-b2c/model/`.
- `lib/details.ts` and `compatibilityQuestions.ts`, with their tests -> `src/features/demo-b2c/schemas/`.
- `lib/weftTypes.ts` -> `src/features/demo-b2c/types/contracts.ts`.
- `lib/compatibility-questions.json` -> `src/features/demo-b2c/data/compatibility-questions.json`.
- Compatibility portion of `content.ts` -> `src/features/demo-b2c/content.ts` as `demoB2cContent`.
- `lib/testEscape.ts` and its test -> `src/features/demo-b2c/test/escape.ts` and `escape.test.ts`.
- `lib/server/weftApi.ts` and its test -> `src/lib/api/weftApi.ts` and `weftApi.test.ts`.
- Every other `lib/server/**` module and test -> `src/features/demo-b2c/api/server/**`.
- New local-endpoint adapters -> `src/features/demo-b2c/api/client/submitAnswers.ts` and `mintInvite.ts`, with colocated tests.

### Configuration and architecture guard

- Modify `tsconfig.json` so `@/*` maps to `./src/*`.
- Create `tests/architecture.test.ts` to enforce source-root and feature ownership boundaries.

---

### Task 1: Establish the `src/` Application Root

**Files:**

- Create: `tests/architecture.test.ts`
- Move: `app/**` to `src/app/**`
- Move: `components/**` to `src/components/**`
- Move: `lib/**` to `src/lib/**`
- Move: `content.ts` to `src/content.ts`
- Move: `src/app/globals.css` to `src/styles/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `tsconfig.json`

**Interfaces:**

- Consumes: Next.js `src/app` convention and existing `@/...` imports.
- Produces: `@/* -> ./src/*`, `src/app/layout.tsx` importing `../styles/globals.css`, and no root-level application directories.

- [ ] **Step 1: Write the failing source-root architecture test**

Create `tests/architecture.test.ts`:

```ts
import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");

test("all application source lives under src", () => {
  expect(existsSync(resolve(projectRoot, "src/app/page.tsx"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/components/ui"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/lib"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "app"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "components"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "lib"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "content.ts"))).toBe(false);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `rtk bun test tests/architecture.test.ts`

Expected: FAIL because `src/app/page.tsx` does not exist and the root `app/`, `components/`, `lib/`, and `content.ts` still exist.

- [ ] **Step 3: Move the application tree mechanically**

Move all current application files into `src/`, preserving relative paths. Include the untracked `app/visual-pair-preview/page.tsx` without changing its content. Keep `public/`, `package.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.env*`, and `bun-test.d.ts` at the root.

Move `src/app/globals.css` to `src/styles/globals.css`, then change the layout import to:

```ts
import "../styles/globals.css";
```

Change `tsconfig.json` paths to:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 4: Verify the source-root test is green**

Run: `rtk bun test tests/architecture.test.ts`

Expected: PASS.

- [ ] **Step 5: Verify the mechanical move did not change behavior**

Run: `rtk bun test`

Expected: all existing tests pass from their new `src/` locations.

Run: `rtk tsc --noEmit`

Expected: no TypeScript errors.

- [ ] **Step 6: Commit only tracked migration files and the architecture test**

Stage the moved tracked files, `tests/architecture.test.ts`, and `tsconfig.json`. Do not stage unrelated `.serena/` files or newly track the pre-existing untracked visual-pair preview unless the user explicitly requests that.

```bash
rtk git commit -m "refactor: move application source under src"
```

### Task 2: Move Demo B2C UI, Model, Schemas, Types, and Content

**Files:**

- Modify: `tests/architecture.test.ts`
- Create by move: `src/features/demo-b2c/components/**`
- Create by move: `src/features/demo-b2c/model/{answers,compatibility,inviteText,links,pairView,submitOutcome}.ts`
- Create by move: colocated tests for every model module above
- Create by move: `src/features/demo-b2c/schemas/{details,compatibilityQuestions}.ts`
- Create by move: colocated tests for both schema modules
- Create by move: `src/features/demo-b2c/types/contracts.ts`
- Create by move: `src/features/demo-b2c/data/compatibility-questions.json`
- Create: `src/features/demo-b2c/content.ts`
- Create by move: `src/features/demo-b2c/test/escape.ts` and `escape.test.ts`
- Modify: `src/content.ts`
- Modify: demo-b2c route modules and route tests under `src/app/compatibility-test/**`
- Modify: `src/app/visual-pair-preview/page.tsx`
- Modify: temporary server modules and tests under `src/lib/server/**` so their type and schema imports point at the new feature paths before Task 3 moves them

**Interfaces:**

- Consumes: shared UI from `@/components/ui/*` and explicit demo feature modules.
- Produces: `demoB2cContent`, `QuizQuestion`, `Details`, feature contracts, and pure model functions at explicit `@/features/demo-b2c/...` paths.

- [ ] **Step 1: Extend the architecture test for feature ownership**

Add this test to `tests/architecture.test.ts`:

```ts
test("demo b2c owns its feature-specific source", () => {
  expect(existsSync(resolve(projectRoot, "src/features/demo-b2c/components/CompatibilityTest.tsx"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/demo-b2c/model/compatibility.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/demo-b2c/schemas/details.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/demo-b2c/types/contracts.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/demo-b2c/content.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/components/compatibility"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "src/lib/compatibility.ts"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "src/lib/weftTypes.ts"))).toBe(false);
});
```

- [ ] **Step 2: Run the feature-ownership test and verify the expected failure**

Run: `rtk bun test tests/architecture.test.ts`

Expected: FAIL because the feature-owned files still live in `src/components/compatibility` and `src/lib`.

- [ ] **Step 3: Move feature components and pure modules**

Move the files according to the File Structure Map. Update imports as follows throughout production files and tests:

```ts
import { CompatibilityTest } from "@/features/demo-b2c/components/CompatibilityTest";
import { toQuizQuestions } from "@/features/demo-b2c/schemas/compatibilityQuestions";
import type { PairResult } from "@/features/demo-b2c/types/contracts";
import { pairHref } from "@/features/demo-b2c/model/links";
```

Keep shared primitive imports under `@/components/ui/*`. Preserve relative imports inside the `components/pair/` subgroup.

- [ ] **Step 4: Split content by ownership without changing copy**

Create `src/features/demo-b2c/content.ts` by moving the existing `content.compatibilityTest` value byte-for-byte and exporting it directly:

Remove the `compatibilityTest:` property label from the moved value, name the value `demoB2cContent`, retain its existing terminal `as const`, and export `type DemoB2cContent = typeof demoB2cContent`. This is a mechanical extraction of the complete existing object; do not edit or retype its nested copy.

Remove only the `compatibilityTest` property from `src/content.ts`. Replace every compatibility import/use:

```ts
import { demoB2cContent } from "@/features/demo-b2c/content";

const data = demoB2cContent;
```

For individual screens and tests, replace `content.compatibilityTest.<section>` with `demoB2cContent.<section>`. Homepage files continue importing `content` from `@/content` unchanged.

- [ ] **Step 5: Verify the feature boundary and behavior**

Run: `rtk bun test tests/architecture.test.ts src/features/demo-b2c src/app/compatibility-test`

Expected: all architecture, feature, and compatibility route tests pass.

Run: `rtk tsc --noEmit`

Expected: no stale `@/components/compatibility`, `@/lib/compatibility*`, `@/lib/details`, `@/lib/links`, `@/lib/pairView`, `@/lib/submitOutcome`, or `@/lib/weftTypes` imports.

- [ ] **Step 6: Commit the feature-core migration**

```bash
rtk git commit -m "refactor: group demo b2c feature source"
```

### Task 3: Establish API Boundaries and Browser Adapters

**Files:**

- Modify: `tests/architecture.test.ts`
- Move: `src/lib/server/weftApi.ts` -> `src/lib/api/weftApi.ts`
- Move: `src/lib/server/weftApi.test.ts` -> `src/lib/api/weftApi.test.ts`
- Move: all remaining `src/lib/server/**` -> `src/features/demo-b2c/api/server/**`
- Create: `src/features/demo-b2c/api/client/submitAnswers.test.ts`
- Create: `src/features/demo-b2c/api/client/submitAnswers.ts`
- Create: `src/features/demo-b2c/api/client/mintInvite.test.ts`
- Create: `src/features/demo-b2c/api/client/mintInvite.ts`
- Modify: `src/features/demo-b2c/components/CompatibilityTest.tsx`
- Modify: `src/features/demo-b2c/components/ReshareLink.tsx`
- Modify: route handlers under `src/app/api/**`
- Modify: server pages under `src/app/compatibility-test/**`

**Interfaces:**

- Consumes: shared `weftFetch<T>(path, init?, fetchImpl?)` and demo-b2c contracts.
- Produces: `postAnswers(payload, signal, fetchImpl?) -> Promise<Response>` and `postInvite(signal, fetchImpl?) -> Promise<Response>` for browser components; explicit server operations under `@/features/demo-b2c/api/server/*`.

- [ ] **Step 1: Extend the architecture test for the API boundary**

Add:

```ts
test("demo b2c owns feature API operations while transport stays shared", () => {
  expect(existsSync(resolve(projectRoot, "src/lib/api/weftApi.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/demo-b2c/api/server/submitAnswers.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/demo-b2c/api/client/submitAnswers.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/lib/server"))).toBe(false);
});
```

- [ ] **Step 2: Run the API-boundary test and verify the expected failure**

Run: `rtk bun test tests/architecture.test.ts`

Expected: FAIL because transport and feature server operations still share `src/lib/server` and no browser adapter exists.

- [ ] **Step 3: Write failing browser-adapter contract tests**

Create tests using a capturing `fetchImpl` and literal expectations. For answers, assert one request to `/api/answers` with method `POST`, `Content-Type: application/json`, the supplied signal, and the exact JSON body. For invites, assert one request to `/api/invite` with method `POST` and the supplied signal. Each fake returns `new Response("{}", { status: 200 })`, and each test asserts that the adapter returns that exact response.

`submitAnswers.test.ts`:

```ts
import { expect, test } from "bun:test";
import type { AnswersRequest } from "@/features/demo-b2c/types/contracts";
import { postAnswers } from "./submitAnswers";

test("postAnswers sends the feature payload to the local answers endpoint", async () => {
  let captured: { input: string; init?: RequestInit } | undefined;
  const expectedResponse = new Response("{}", { status: 200 });
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured = { input: String(input), init };
    return expectedResponse;
  }) as typeof fetch;
  const controller = new AbortController();
  const payload: AnswersRequest = {
    name: "Ada",
    email: "ada@example.com",
    phone: "+1 555 0100",
    answers: { q1: 2, q2: [0, 3] },
    invite_token: "invite-1",
  };

  const response = await postAnswers(payload, controller.signal, fetchImpl);

  expect(response).toBe(expectedResponse);
  expect(captured?.input).toBe("/api/answers");
  expect(captured?.init?.method).toBe("POST");
  expect(new Headers(captured?.init?.headers).get("Content-Type")).toBe("application/json");
  expect(captured?.init?.signal).toBe(controller.signal);
  expect(captured?.init?.body).toBe(JSON.stringify(payload));
});
```

`mintInvite.test.ts`:

```ts
import { expect, test } from "bun:test";
import { postInvite } from "./mintInvite";

test("postInvite requests a fresh invite from the local endpoint", async () => {
  let captured: { input: string; init?: RequestInit } | undefined;
  const expectedResponse = new Response("{}", { status: 200 });
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured = { input: String(input), init };
    return expectedResponse;
  }) as typeof fetch;
  const controller = new AbortController();

  const response = await postInvite(controller.signal, fetchImpl);

  expect(response).toBe(expectedResponse);
  expect(captured?.input).toBe("/api/invite");
  expect(captured?.init?.method).toBe("POST");
  expect(captured?.init?.signal).toBe(controller.signal);
});
```

Run: `rtk bun test src/features/demo-b2c/api/client`

Expected: FAIL because `postAnswers` and `postInvite` do not exist.

- [ ] **Step 4: Implement minimal browser adapters**

Create `submitAnswers.ts`:

```ts
import type { AnswersRequest } from "@/features/demo-b2c/types/contracts";

export function postAnswers(
  payload: AnswersRequest,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  return fetchImpl("/api/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(payload),
  });
}
```

Create `mintInvite.ts`:

```ts
export function postInvite(
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  return fetchImpl("/api/invite", { method: "POST", signal });
}
```

Replace the two inline `fetch` calls in `CompatibilityTest.tsx` and `ReshareLink.tsx` with these adapters. Keep `SUBMIT_TIMEOUT_MS = 15000` and invite `TIMEOUT_MS = 8000` in their current components so user-facing timeout behavior does not change.

- [ ] **Step 5: Move server operations and update imports**

Move `weftApi` to `src/lib/api/`. Move `answersResponse`, `bank`, `invite`, `mintInvite`, `myPairs`, `pair`, `session`, and `submitAnswers`, with all tests, to `src/features/demo-b2c/api/server/`.

Update server operation imports to:

```ts
import { weftFetch } from "@/lib/api/weftApi";
import type { AnswersRequest } from "@/features/demo-b2c/types/contracts";
import { isBankResponse } from "@/features/demo-b2c/schemas/compatibilityQuestions";
```

Update route modules to explicit paths such as:

```ts
import { submitAnswers } from "@/features/demo-b2c/api/server/submitAnswers";
import { readSessionId } from "@/features/demo-b2c/api/server/session";
```

- [ ] **Step 6: Verify API contracts and integration tests**

Run: `rtk bun test tests/architecture.test.ts src/lib/api src/features/demo-b2c/api src/features/demo-b2c/components/CompatibilityTest.interaction.test.ts src/features/demo-b2c/components/ReshareLink.test.tsx src/app/api`

Expected: all tests pass.

Run: `rtk tsc --noEmit`

Expected: no TypeScript errors and no imports from `@/lib/server/*`.

- [ ] **Step 7: Commit the API boundary**

```bash
rtk git commit -m "refactor: isolate demo b2c API boundary"
```

### Task 4: Remove Migration Debris and Verify the Production Application

**Files:**

- Modify if required: imports anywhere under `src/`
- Modify if required: `tests/architecture.test.ts`
- Remove: empty legacy directories left by moves

**Interfaces:**

- Consumes: completed `src/` tree and all existing public routes.
- Produces: a clean feature-first repository with passing tests, lint, type checking, and production build.

- [ ] **Step 1: Audit the final tree and import directions**

Run:

```bash
rtk proxy find src -type f | sort
rtk proxy rg -n '@/components/compatibility|@/lib/server|@/lib/(answers|compatibility|compatibilityQuestions|details|inviteText|links|pairView|submitOutcome|weftTypes)' src tests
```

Expected: the file listing matches the approved ownership map; the stale-import search returns no matches. Confirm there are no empty `hooks/` or `analytics/` directories and no root `app/`, `components/`, `lib/`, or `content.ts`.

- [ ] **Step 2: Run the complete automated test suite**

Run: `rtk bun test`

Expected: all tests pass with no failures.

- [ ] **Step 3: Run static verification**

Run: `rtk lint`

Expected: ESLint exits successfully with no errors.

Run: `rtk tsc --noEmit`

Expected: TypeScript exits successfully with no errors.

- [ ] **Step 4: Run the production build**

Run: `rtk bun run build`

Expected: Next.js 16.2.11 completes a production build and lists the same public routes as before the migration.

- [ ] **Step 5: Inspect the final diff and workspace state**

Run:

```bash
rtk git diff --check
rtk git status --short
rtk git diff --stat
```

Expected: no whitespace errors; only the planned migration is tracked; `.serena/` and the user's pre-existing visual preview state remain preserved and are not accidentally staged.

- [ ] **Step 6: Commit any final import or cleanup fixes**

If Task 4 required tracked fixes, commit only those files:

```bash
rtk git commit -m "chore: verify demo b2c architecture migration"
```

If no tracked fixes were required, do not create an empty commit.
