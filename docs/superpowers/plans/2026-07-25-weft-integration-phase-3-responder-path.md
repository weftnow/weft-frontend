# Weft Integration — Phase 3: Responder Path & Pair Result Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second person opens a share link, answers the sender's exact questions, and both of them land on a real compatibility result — with a link of their own to pass on.

**Architecture:** Two new SSR pages. `/compatibility-test/invite/[token]` loads the invite server-side through `lib/server/invite.ts` and renders the *existing* `CompatibilityTest` in responder mode — same quiz, same details form, different intro and a different ending. Submitting posts to the existing `/api/answers` Route Handler with `invite_token`, which the existing proxy already forwards; the response now carries a `pair_id`, and the browser navigates to `/compatibility-test/pair/[id]`, which loads the result through `lib/server/pair.ts` and renders both fuller profiles. A dead invite (expired, unknown, backend down) renders a worded notice rather than a generic 404.

**Tech Stack:** Next.js 16.2.11 (App Router), React 19.2.4, TypeScript strict, Tailwind v4, `bun test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-25-weft-backend-frontend-integration-design.md`
**Preceded by:** Phase 0 (`weft_core` branch `feat/bff-contract`, complete), Phase 1 and Phase 2 (this repo, branch `feat/bff-foundation`, complete).

## Global Constraints

- **Repo:** `/Users/shearytan/Documents/SurnX/web-frontend`, continuing on the existing branch `feat/bff-foundation`. Never commit to `main`.
- **No new dependencies.** Built-in `fetch`, `next/headers`, `next/link`, React, Tailwind classes already in the codebase.
- **Server-only secrets.** `WEFT_API_URL` / `WEFT_PROXY_KEY` are read *only* inside `lib/server/weftApi.ts`. Never `NEXT_PUBLIC_`, never imported by a client component.
- **The `session_id` never reaches the browser.** Unchanged from Phase 2: `/api/answers` puts it in the httpOnly `weft_session` cookie and strips it from the JSON body.
- **Tests colocate** as `<name>.test.ts(x)` beside the file, and run with `bun test`.
- **Baseline before this phase starts:** `bun test` → **144 pass, 4 fail**. The four failures are pre-existing on `main` (`components/sections/Turn.test.tsx`, `Nav.test.tsx`, `Faq.test.tsx`, `Hero.test.tsx` — unrelated media/copy assertions). Do not fix them here; do not add to them.
- **`PremiumButton` explodes its label into per-glyph `<span>`s.** `expect(html).toContain("Begin")` only passes because the component also sets `aria-label={children}`. When asserting on a `PremiumButton` label, assert on `aria-label="…"`.
- **`renderToStaticMarkup` HTML-escapes apostrophes** (`'` → `&#x27;`). Copy containing an apostrophe must be compared with `.replace(/'/g, "&#x27;")`, as `ShareScreen.test.tsx` already does.
- **No component in this phase may call `useRouter()`.** Every component test in this repo renders with `renderToStaticMarkup` outside an App Router context, where `useRouter()` throws. Responder navigation uses `window.location.assign` inside an event handler — see Task 6 for the full reasoning.

### Verified backend contract

Read directly from `weft_core@feat/bff-contract` (HEAD `c85ecf2`). All error bodies are `{"detail": "<string>"}`; `lib/server/weftApi.ts` already turns `detail` into `message` for 400/404/410 and swallows it otherwise.

`GET /api/invite/{token}` (`weft/api.py:169-181`):
```jsonc
{ "from_name": "Ana",
  "question_set": ["Q1", "..."],                 // the sender's set, 20 ids
  "questions": [ { "id": "Q1", "kind": "single" | "pick2", "seg": 1,
                   "prompt": "...", "options": ["...", "..."] } ] }
```
- unknown token → **404** `unknown invite`
- expired → **410** `this invite has expired`
- Tokens are **not single-use**: one invite can be answered by many people, producing many pairs. There is no "already used" error and no guard against answering your own invite.

`POST /api/answers` responder branch (`weft/api.py:117-161`) → `{ session_id, share_token, role: "responder", pair_id }`. Errors, in the backend's own evaluation order: 400 `name, email and phone are required` → 404 `unknown invite` → 410 `this invite has expired` → 400 validation (`Q12 needs exactly 2 choices, got 1`, `Q7 is not in the served set`, `missing answers for: Q4, Q9`, …). **`app/api/answers/route.ts`, `lib/server/submitAnswers.ts` and `lib/weftTypes.ts` already handle this branch and need no changes in this phase.**

`GET /api/pair/{pair_id}` (`weft/api.py:184-189`, built by `weft/report.py:214-240`):
```jsonc
{ "headline": "Ana and Ben both lead with Benevolence.",
  "band": "A real mix — some deep overlap, some genuine difference.",
  "shared_values": [ { "key": "BE", "name": "Benevolence", "tagline": "...", "blurb": "..." } ],
  "difference": "Where you differ most is ...",
  "people": [ { "name": "Ana", "top_values": [ /* ValueEntry */ ],
                "humour": "warm/affiliative", "opens_up": "opens up quickly",
                "pace": "likes a steady rhythm", "life_stage": "rooting" } ] }
```
- unknown id → **404** `unknown pair`
- Everything is a string; there are **no numbers anywhere** in the payload.
- `people` is always exactly 2, positionally: `people[0]` is the sender, `people[1]` is the responder. **Nothing in the payload says which is which**, and no session id appears, so the viewer cannot be identified from it — the UI names both people rather than saying "you".
- `shared_values` may be `[]` (the headline switches wording when it is).
- `top_values` is normally 2 entries.
- `humour` may be the literal em-dash `"—"` and `life_stage` may be `"unspecified"` when a trait was not measured.

`lib/weftTypes.ts` already declares `InviteResponse`, `PairResult`, `PairPerson` and `ValueEntry` matching the above exactly. **No changes to `lib/weftTypes.ts` in this phase.**

### Deviation from the spec's route map — read before Task 2

The spec's BFF route table lists `GET /api/invite/[token]` and `GET /api/pair/[id]` as Route Handlers. **This plan does not build them.** In the same spec, both pages are specified as SSR, so the only consumer of that data is a Server Component — which reaches the backend through `weftFetch` server-to-server already. A Route Handler nobody calls is dead code and a public endpoint that widens the attack surface for no gain. The shared server helpers (`lib/server/invite.ts`, `lib/server/pair.ts`) hold the logic and carry the tests instead.

`POST /api/invite` is likewise not built: the responder's share token arrives in their own submit response, so nothing needs to mint a second one.

**The reviewer should confirm this at the exit gate.** If a client-side consumer appears later (Phase 4's matches page does not need one), the helpers are already the testable core a thin handler would wrap.

### Next.js 16 facts this plan depends on

Verified in `node_modules/next/dist/docs/`:
- `params` **and** `searchParams` are `Promise`s and must be awaited, in both pages and Route Handlers (`03-api-reference/03-file-conventions/dynamic-routes.md`, `.../page.md:67-77`).
- `metadata.robots` accepts `{ index: false, follow: false }` (`04-functions/generate-metadata.md:551`). Both new pages are capability URLs and must carry it.
- `useRouter` comes from `next/navigation` and works only inside a mounted App Router — see the constraint above.
- Route Handlers are not cached by default and are public HTTP endpoints.

---

## File Structure

| File | Responsibility |
|---|---|
| `bun-test.d.ts` *(modify)* | Complete the matcher shim so `bunx tsc --noEmit` becomes a usable gate |
| `tsconfig.json` *(modify)* | `target` → `ES2022`, so modern regex flags stop erroring |
| `lib/compatibilityQuestions.ts` *(modify)* | Export `isBankQuestion`; `isBankResponse` reuses it |
| `lib/server/invite.ts` *(create)* | `loadInvite()` — ok / expired / not_found / unavailable |
| `lib/server/invite.test.ts` *(create)* | Status mapping, shape guard, no-round-trip guard |
| `lib/server/pair.ts` *(create)* | `loadPair()` — ok / not_found / unavailable |
| `lib/server/pair.test.ts` *(create)* | Status mapping and the friend-safe shape guard |
| `lib/links.ts` *(create)* | `inviteHref`, `pairHref`, `readShareParam` — the frontend owns URL shape |
| `lib/links.test.ts` *(create)* | Encoding and the optional share token |
| `lib/inviteText.ts` *(create)* | `displayName`, `withName` — the sender's name in copy, length-capped |
| `lib/inviteText.test.ts` *(create)* | Trimming, truncation, substitution |
| `lib/submitOutcome.ts` *(modify)* | New `"pair"` branch when the response carries a `pair_id` |
| `lib/submitOutcome.test.ts` *(modify)* | Responder cases |
| `content.ts` *(modify)* | `invite`, `inviteError` and `pair` copy blocks |
| `content.test.ts` *(modify)* | Exact-match assertions for the three new blocks |
| `app/globals.css` *(modify)* | Pair-result layout: sections, person cards, values, traits |
| `components/compatibility/CtestShell.tsx` *(create)* | The shared page furniture: backdrop, ambients, home link |
| `components/compatibility/CompatibilityNotice.tsx` *(create)* | Expired / unknown / unavailable dead ends |
| `components/compatibility/CompatibilityNotice.test.tsx` *(create)* | Copy and optional CTA |
| `components/compatibility/ShareLink.tsx` *(create)* | Link box + copy button, extracted from `ShareScreen` |
| `components/compatibility/ShareLink.test.tsx` *(create)* | Path rendering and the escaped-origin case |
| `components/compatibility/ShareScreen.tsx` *(modify)* | Composes `ShareLink` instead of owning the clipboard logic |
| `components/compatibility/CompatibilityTest.tsx` *(modify)* | Optional `invite` prop: responder intro, `invite_token`, pair navigation |
| `components/compatibility/CompatibilityTest.test.tsx` *(modify)* | Responder-mode intro assertions |
| `lib/pairView.ts` *(create)* | `personTraits()` — drops the traits the backend could not measure |
| `lib/pairView.test.ts` *(create)* | Unknown-trait filtering |
| `components/compatibility/PairResultView.tsx` *(create)* | The two-person result screen |
| `components/compatibility/PairResultView.test.tsx` *(create)* | Both profiles, empty shared values, share block |
| `app/compatibility-test/invite/[token]/page.tsx` *(create)* | SSR friend landing |
| `app/compatibility-test/invite/[token]/page.test.tsx` *(create)* | Notice wiring and noindex metadata |
| `app/compatibility-test/pair/[id]/page.tsx` *(create)* | SSR pair result |
| `app/compatibility-test/pair/[id]/page.test.tsx` *(create)* | Notice wiring and noindex metadata |

---

### Task 1: Make the typecheck a real gate

`bunx tsc --noEmit` currently reports **37 errors, every one of them from the test-type shim or the compiler target** — non-test source is already clean. That means the typecheck cannot be used as an exit gate, and a genuine type error introduced by this phase would be invisible in the noise. Two small edits fix it.

`bun-test.d.ts` declares six matchers; the suite uses `.not`, `toMatch`, `toThrow`, `toBeTruthy`, `toBeUndefined` and `beforeEach` as well. Separately, `target: "ES2017"` makes TypeScript reject the `s` regex flag in `components/sections/Nav.test.tsx` (`TS1501`). `lib` is already `esnext` and Next compiles with SWC on its own target, so raising `target` changes nothing at runtime — it only stops TypeScript rejecting syntax the code already ships.

**Files:**
- Modify: `bun-test.d.ts` (whole file)
- Modify: `tsconfig.json:3` (the `target` line)

**Interfaces:**
- Produces: nothing importable. Every later task's `bunx tsc --noEmit` step depends on this being clean.

- [ ] **Step 1: Record the failure**

Run: `bunx tsc --noEmit 2>&1 | wc -l`
Expected: `37`

- [ ] **Step 2: Complete the matcher shim**

Replace the whole contents of `bun-test.d.ts`:

```ts
declare module "bun:test" {
  type TestBody = () => void | Promise<void>;

  type Matchers = {
    toBe(expected: unknown): void;
    toBeGreaterThan(expected: number): void;
    toBeNull(): void;
    toBeTruthy(): void;
    toBeUndefined(): void;
    toContain(expected: string): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
    toMatch(expected: RegExp | string): void;
    toThrow(expected?: RegExp | string): void;
    /** Every matcher above, inverted. Nesting `not.not` is not a thing. */
    not: Omit<Matchers, "not">;
  };

  export function afterEach(body: TestBody): void;
  export function beforeEach(body: TestBody): void;
  export function describe(name: string, body: TestBody): void;
  export function expect(actual: unknown): Matchers;
  export function test(name: string, body: TestBody): void;
}
```

- [ ] **Step 3: Raise the compiler target**

In `tsconfig.json`, change:

```json
    "target": "ES2017",
```

to:

```json
    "target": "ES2022",
```

- [ ] **Step 4: Verify the typecheck is clean**

Run: `bunx tsc --noEmit && echo "typecheck clean"`
Expected: `typecheck clean`

- [ ] **Step 5: Verify no test behaviour changed**

Run: `bun test 2>&1 | tail -4`
Expected: still `144 pass`, `4 fail` — the shim is types only, and the target does not affect `bun test`.

- [ ] **Step 6: Commit**

```bash
git add bun-test.d.ts tsconfig.json
git commit -m "chore: make bunx tsc --noEmit a usable gate"
```

---

### Task 2: Reading an invite and a pair, server-side

Both pages need the same thing: fetch, decide what kind of failure it was, and refuse to render anything that would not render. The two helpers are near-identical by design — `loadInvite` has one extra outcome (`expired`) because a 410 and a 404 must reach the visitor as different words.

**Files:**
- Modify: `lib/compatibilityQuestions.ts:41-55` (the `isBankResponse` block)
- Create: `lib/server/invite.ts`
- Test: `lib/server/invite.test.ts`
- Create: `lib/server/pair.ts`
- Test: `lib/server/pair.test.ts`

**Interfaces:**
- Consumes: `weftFetch` (Phase 1), `InviteResponse` / `PairResult` / `PairPerson` / `ValueEntry` / `BankQuestion` (Phase 1).
- Produces:
  - `isBankQuestion(value: unknown): value is BankQuestion` — newly exported from `lib/compatibilityQuestions.ts`
  - `type InviteOutcome = { status: "ok"; invite: InviteResponse } | { status: "expired" } | { status: "not_found" } | { status: "unavailable" }`
  - `loadInvite(token: string, fetchImpl?: typeof fetch): Promise<InviteOutcome>`
  - `isInviteResponse(value: unknown): value is InviteResponse`
  - `type PairOutcome = { status: "ok"; result: PairResult } | { status: "not_found" } | { status: "unavailable" }`
  - `loadPair(pairId: string, fetchImpl?: typeof fetch): Promise<PairOutcome>`
  - `isPairResult(value: unknown): value is PairResult`

**Why `unauthorized` collapses into `unavailable`:** a rejected proxy key is our misconfiguration. The visitor did nothing wrong and can do nothing about it, so they get the same "try again shortly" as an outage — exactly as `submitAnswers` already treats it.

- [ ] **Step 1: Write the failing tests**

Create `lib/server/invite.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { isInviteResponse, loadInvite } from "./invite";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const INVITE = {
  from_name: "Ana",
  question_set: ["Q1"],
  questions: [
    { id: "Q1", prompt: "One of these", kind: "single", seg: 1, options: ["a", "b"] },
  ],
};

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
});

describe("loadInvite", () => {
  test("hands back an invite the friend can render", async () => {
    const outcome = await loadInvite("tok", async () => json(INVITE));
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.invite.from_name).toBe("Ana");
      expect(outcome.invite.questions).toHaveLength(1);
    }
  });

  test("asks the backend for the token it was given", async () => {
    let url = "";
    await loadInvite("a b/c", async (input) => {
      url = String(input);
      return json(INVITE);
    });
    // A token is data, not URL syntax.
    expect(url).toBe("https://api.example.test/api/invite/a%20b%2Fc");
  });

  test("an expired invite is its own outcome, not a not-found", async () => {
    const outcome = await loadInvite("old", async () =>
      json({ detail: "this invite has expired" }, 410),
    );
    expect(outcome.status).toBe("expired");
  });

  test("an unknown token is a not-found", async () => {
    const outcome = await loadInvite("nope", async () =>
      json({ detail: "unknown invite" }, 404),
    );
    expect(outcome.status).toBe("not_found");
  });

  test("a backend having a moment is unavailable, not not-found", async () => {
    const outcome = await loadInvite("tok", async () => json({ detail: "boom" }, 500));
    expect(outcome.status).toBe("unavailable");
  });

  test("a rejected proxy key reads as unavailable -- it is our problem", async () => {
    const outcome = await loadInvite("tok", async () => json({ detail: "nope" }, 401));
    expect(outcome.status).toBe("unavailable");
  });

  test("a 200 that would not render is not trusted", async () => {
    const outcome = await loadInvite("tok", async () =>
      json({ from_name: "Ana", question_set: ["Q1"], questions: [] }),
    );
    expect(outcome.status).toBe("unavailable");
  });

  test("junk in the path never reaches the backend", async () => {
    let called = false;
    const spy = async () => {
      called = true;
      return json(INVITE);
    };
    expect((await loadInvite("", spy)).status).toBe("not_found");
    expect((await loadInvite("x".repeat(200), spy)).status).toBe("not_found");
    expect(called).toBe(false);
  });
});

describe("isInviteResponse", () => {
  test("accepts the real payload", () => {
    expect(isInviteResponse(INVITE)).toBe(true);
  });

  test("rejects anything the quiz could not render", () => {
    expect(isInviteResponse(null)).toBe(false);
    expect(isInviteResponse({ ...INVITE, from_name: 7 })).toBe(false);
    expect(isInviteResponse({ ...INVITE, question_set: [] })).toBe(false);
    expect(isInviteResponse({ ...INVITE, questions: [{ id: "Q1" }] })).toBe(false);
    // A question with one option is a question with no choice in it.
    expect(
      isInviteResponse({
        ...INVITE,
        questions: [{ id: "Q1", prompt: "p", kind: "single", seg: 1, options: ["only"] }],
      }),
    ).toBe(false);
  });
});
```

Create `lib/server/pair.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { isPairResult, loadPair } from "./pair";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const VALUE = { key: "BE", name: "Benevolence", tagline: "care up close", blurb: "..." };

const PERSON = {
  name: "Ana",
  top_values: [VALUE],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

const PAIR = {
  headline: "Ana and Ben both lead with Benevolence.",
  band: "A real mix.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
});

describe("loadPair", () => {
  test("hands back both people", async () => {
    const outcome = await loadPair("p1", async () => json(PAIR));
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.people).toHaveLength(2);
      expect(outcome.result.people[1].name).toBe("Ben");
    }
  });

  test("encodes the id into the upstream path", async () => {
    let url = "";
    await loadPair("a/b", async (input) => {
      url = String(input);
      return json(PAIR);
    });
    expect(url).toBe("https://api.example.test/api/pair/a%2Fb");
  });

  test("an unknown pair is a not-found", async () => {
    const outcome = await loadPair("nope", async () => json({ detail: "unknown pair" }, 404));
    expect(outcome.status).toBe("not_found");
  });

  test("an outage is unavailable", async () => {
    const outcome = await loadPair("p1", async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(outcome.status).toBe("unavailable");
  });

  test("a 200 with the wrong shape is not trusted", async () => {
    const outcome = await loadPair("p1", async () => json({ ...PAIR, people: [PERSON] }));
    expect(outcome.status).toBe("unavailable");
  });

  test("junk in the path never reaches the backend", async () => {
    let called = false;
    const outcome = await loadPair("", async () => {
      called = true;
      return json(PAIR);
    });
    expect(outcome.status).toBe("not_found");
    expect(called).toBe(false);
  });
});

describe("isPairResult", () => {
  test("accepts the real payload", () => {
    expect(isPairResult(PAIR)).toBe(true);
  });

  test("accepts a pair with no shared values", () => {
    // Two people with nothing in their top two is a real, renderable result.
    expect(isPairResult({ ...PAIR, shared_values: [] })).toBe(true);
  });

  test("rejects a payload that is not two people", () => {
    expect(isPairResult(null)).toBe(false);
    expect(isPairResult({ ...PAIR, people: [] })).toBe(false);
    expect(isPairResult({ ...PAIR, people: [PERSON, PERSON, PERSON] })).toBe(false);
    expect(isPairResult({ ...PAIR, people: [PERSON, { name: "Ben" }] })).toBe(false);
  });

  test("rejects a value that lost its copy", () => {
    expect(isPairResult({ ...PAIR, shared_values: [{ key: "BE", name: "Benevolence" }] })).toBe(
      false,
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/server/invite.test.ts lib/server/pair.test.ts`
Expected: FAIL — cannot resolve `./invite` or `./pair`.

- [ ] **Step 3: Export the per-question guard so both modules share it**

In `lib/compatibilityQuestions.ts`, replace the `isBankResponse` function with:

```ts
/**
 * One question, checked hard enough to know it will render: a prompt to read
 * and at least two things to choose between. `seg` is carried through
 * untouched and never read by the UI, so it is not checked here.
 */
export function isBankQuestion(value: unknown): value is BankQuestion {
  if (typeof value !== "object" || value === null) return false;
  const q = value as Partial<BankQuestion>;
  return (
    typeof q.id === "string" &&
    typeof q.prompt === "string" &&
    (q.kind === "single" || q.kind === "pick2") &&
    Array.isArray(q.options) &&
    q.options.length > 1 &&
    q.options.every((o: unknown) => typeof o === "string")
  );
}

/**
 * Guards the upstream payload before it is trusted enough to render. A backend
 * that answers 200 with something unexpected should land on the fallback, not
 * on a blank quiz.
 */
export function isBankResponse(value: unknown): value is BankResponse {
  if (typeof value !== "object" || value === null) return false;
  const { questions, question_set: set } = value as Partial<BankResponse>;
  if (!Array.isArray(questions) || questions.length === 0) return false;
  if (!Array.isArray(set) || set.length === 0) return false;
  return questions.every(isBankQuestion);
}
```

- [ ] **Step 4: Implement `loadInvite`**

Create `lib/server/invite.ts`:

```ts
import { isBankQuestion } from "@/lib/compatibilityQuestions";
import { weftFetch } from "@/lib/server/weftApi";
import type { InviteResponse } from "@/lib/weftTypes";

/**
 * What the friend landing page can be. `expired` is deliberately not folded
 * into `not_found`: "your link ran out" and "we have never seen that link"
 * are different facts, and the person holding the link can act on the first.
 */
export type InviteOutcome =
  | { status: "ok"; invite: InviteResponse }
  | { status: "expired" }
  | { status: "not_found" }
  | { status: "unavailable" };

/** token_urlsafe(16) is 22 characters. Nothing near this cap is a real token. */
const MAX_TOKEN_LENGTH = 128;

export function isInviteResponse(value: unknown): value is InviteResponse {
  if (typeof value !== "object" || value === null) return false;
  const { from_name: from, question_set: set, questions } =
    value as Partial<InviteResponse>;
  if (typeof from !== "string") return false;
  if (!Array.isArray(set) || set.length === 0) return false;
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.every(isBankQuestion);
}

/**
 * The sender's name and the sender's exact questions. Answering the sender's
 * own set -- rather than a freshly loaded bank -- is what stops a later bank
 * edit leaving the two people answering different things.
 */
export async function loadInvite(
  token: string,
  fetchImpl?: typeof fetch,
): Promise<InviteOutcome> {
  // A junk path segment is not worth an upstream round trip.
  if (token === "" || token.length > MAX_TOKEN_LENGTH) return { status: "not_found" };

  const result = await weftFetch<unknown>(
    `/api/invite/${encodeURIComponent(token)}`,
    { method: "GET" },
    fetchImpl,
  );

  if (!result.ok) {
    if (result.code === "expired") return { status: "expired" };
    if (result.code === "not_found") return { status: "not_found" };
    // Including `unauthorized`: a rejected proxy key is our misconfiguration,
    // and the visitor can do nothing with that information.
    return { status: "unavailable" };
  }

  if (!isInviteResponse(result.data)) {
    console.error("weft_core returned an unrenderable invite");
    return { status: "unavailable" };
  }

  return { status: "ok", invite: result.data };
}
```

- [ ] **Step 5: Implement `loadPair`**

Create `lib/server/pair.ts`:

```ts
import { weftFetch } from "@/lib/server/weftApi";
import type { PairPerson, PairResult, ValueEntry } from "@/lib/weftTypes";

export type PairOutcome =
  | { status: "ok"; result: PairResult }
  | { status: "not_found" }
  | { status: "unavailable" };

const MAX_ID_LENGTH = 128;

function isValueEntry(value: unknown): value is ValueEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<ValueEntry>;
  return (
    typeof v.key === "string" &&
    typeof v.name === "string" &&
    typeof v.tagline === "string" &&
    typeof v.blurb === "string"
  );
}

function isPairPerson(value: unknown): value is PairPerson {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<PairPerson>;
  return (
    typeof p.name === "string" &&
    Array.isArray(p.top_values) &&
    p.top_values.every(isValueEntry) &&
    typeof p.humour === "string" &&
    typeof p.opens_up === "string" &&
    typeof p.pace === "string" &&
    typeof p.life_stage === "string"
  );
}

/**
 * `people` is exactly two, in the backend's order: the sender first, the
 * responder second. Nothing in the payload identifies which of them is
 * reading it, which is why the UI names both rather than saying "you".
 * `shared_values` is allowed to be empty -- two people with nothing in
 * common is a result, not a malformed response.
 */
export function isPairResult(value: unknown): value is PairResult {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<PairResult>;
  return (
    typeof p.headline === "string" &&
    typeof p.band === "string" &&
    Array.isArray(p.shared_values) &&
    p.shared_values.every(isValueEntry) &&
    typeof p.difference === "string" &&
    Array.isArray(p.people) &&
    p.people.length === 2 &&
    p.people.every(isPairPerson)
  );
}

/** The friend-safe compatibility result: words only, never scores or answers. */
export async function loadPair(
  pairId: string,
  fetchImpl?: typeof fetch,
): Promise<PairOutcome> {
  if (pairId === "" || pairId.length > MAX_ID_LENGTH) return { status: "not_found" };

  const result = await weftFetch<unknown>(
    `/api/pair/${encodeURIComponent(pairId)}`,
    { method: "GET" },
    fetchImpl,
  );

  if (!result.ok) {
    if (result.code === "not_found") return { status: "not_found" };
    return { status: "unavailable" };
  }

  if (!isPairResult(result.data)) {
    console.error("weft_core returned an unrenderable pair result");
    return { status: "unavailable" };
  }

  return { status: "ok", result: result.data };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test lib/server/invite.test.ts lib/server/pair.test.ts lib/compatibilityQuestions.test.ts lib/server/bank.test.ts`
Expected: PASS — 10 new invite tests, 10 new pair tests, and the existing
`compatibilityQuestions` and `bank` suites still green. Those last two are run
here because `isBankResponse` was refactored underneath them.

- [ ] **Step 7: Typecheck**

Run: `bunx tsc --noEmit && echo "typecheck clean"`
Expected: `typecheck clean`

- [ ] **Step 8: Commit**

```bash
git add lib/compatibilityQuestions.ts lib/server/invite.ts lib/server/invite.test.ts lib/server/pair.ts lib/server/pair.test.ts
git commit -m "feat: read invites and pair results server-side"
```

---

### Task 3: The pure decisions behind the responder's ending

Three small pure modules and one edit. All of them exist so the components that
use them stay thin enough to read: URL shape in one place, the sender's name
sanitised in one place, and the "where does this submission land" decision
testable without a DOM.

**Files:**
- Create: `lib/links.ts`
- Test: `lib/links.test.ts`
- Create: `lib/inviteText.ts`
- Test: `lib/inviteText.test.ts`
- Modify: `lib/submitOutcome.ts` (whole file)
- Modify: `lib/submitOutcome.test.ts` (append three tests)

**Interfaces:**
- Produces:
  - `inviteHref(token: string): string`
  - `pairHref(pairId: string, shareToken?: string | null): string`
  - `readShareParam(value: string | string[] | undefined): string | null`
  - `displayName(raw: string): string`
  - `withName(template: string, raw: string): string`
  - `type SubmitDecision = { phase: "share"; token: string } | { phase: "pair"; pairId: string; shareToken: string } | { phase: "details"; error: string }`
  - `decideSubmitOutcome(ok: boolean, body: { share_token?: string; pair_id?: string; error?: string } | null, fallbackError: string): SubmitDecision`

**Why the share token rides in the query string:** a responder's submit response
carries both a `pair_id` and their own `share_token`, and the spec requires the
referral chain to survive past depth one. Navigating to the pair page loses
everything not in the URL. A share token is a capability *designed to be handed
out* — putting it in a link is what it is for — so `?share=<token>` is the
honest carrier. The cost is that someone forwarding the whole pair URL also
forwards the ability to pair with the responder; that is the same thing the
share link itself does.

**Why `pair_id` outranks `share_token`:** a responder's response has both. The
result is what they came for; the share link is the next thing to offer, and
the pair page offers it.

- [ ] **Step 1: Write the failing tests**

Create `lib/links.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { inviteHref, pairHref, readShareParam } from "./links";

describe("inviteHref", () => {
  test("builds the friend landing path", () => {
    expect(inviteHref("tok-1")).toBe("/compatibility-test/invite/tok-1");
  });

  test("encodes a token that would otherwise change the path", () => {
    expect(inviteHref("a/b?c")).toBe("/compatibility-test/invite/a%2Fb%3Fc");
  });
});

describe("pairHref", () => {
  test("builds the result path", () => {
    expect(pairHref("p1")).toBe("/compatibility-test/pair/p1");
  });

  test("carries a share token so the responder can invite onward", () => {
    expect(pairHref("p1", "tok-2")).toBe("/compatibility-test/pair/p1?share=tok-2");
  });

  test("leaves the query off when there is no token to carry", () => {
    expect(pairHref("p1", "")).toBe("/compatibility-test/pair/p1");
    expect(pairHref("p1", null)).toBe("/compatibility-test/pair/p1");
  });

  test("encodes both halves", () => {
    expect(pairHref("p/1", "a&b")).toBe("/compatibility-test/pair/p%2F1?share=a%26b");
  });
});

describe("readShareParam", () => {
  test("takes a single value", () => {
    expect(readShareParam("tok")).toBe("tok");
  });

  test("takes the first of a repeated query key", () => {
    expect(readShareParam(["tok", "other"])).toBe("tok");
  });

  test("treats absent and empty the same", () => {
    expect(readShareParam(undefined)).toBeNull();
    expect(readShareParam("")).toBeNull();
    expect(readShareParam([])).toBeNull();
  });
});
```

Create `lib/inviteText.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { displayName, withName } from "./inviteText";

describe("displayName", () => {
  test("passes an ordinary name through", () => {
    expect(displayName("Ana")).toBe("Ana");
  });

  test("tidies the whitespace a form leaves behind", () => {
    expect(displayName("  Ana   Maria  ")).toBe("Ana Maria");
  });

  test("caps a name that would swallow the headline", () => {
    const long = displayName("A".repeat(80));
    expect(long.length).toBe(32);
    expect(long.endsWith("…")).toBe(true);
  });

  test("falls back rather than addressing nobody", () => {
    expect(displayName("   ")).toBe("Someone");
  });
});

describe("withName", () => {
  test("fills every slot in the template", () => {
    expect(withName("{name} invited you, {name}", "Ana")).toBe(
      "Ana invited you, Ana",
    );
  });

  test("uses the tidied name", () => {
    expect(withName("From {name}.", "  Ben ")).toBe("From Ben.");
  });
});
```

Append to `lib/submitOutcome.test.ts`:

```ts
test("a responder's pair id sends them to the result, not the share screen", () => {
  const outcome = decideSubmitOutcome(
    true,
    { pair_id: "p1", share_token: "tok-2" },
    FALLBACK,
  );
  expect(outcome).toEqual({ phase: "pair", pairId: "p1", shareToken: "tok-2" });
});

test("a pair id without a share token still reaches the result", () => {
  // The result is what they came for; sharing onward is the consolation.
  const outcome = decideSubmitOutcome(true, { pair_id: "p1" }, FALLBACK);
  expect(outcome).toEqual({ phase: "pair", pairId: "p1", shareToken: "" });
});

test("a failed responder submission stays on the details form", () => {
  const outcome = decideSubmitOutcome(
    false,
    { pair_id: "p1", error: "this invite has expired" },
    FALLBACK,
  );
  expect(outcome).toEqual({ phase: "details", error: "this invite has expired" });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/links.test.ts lib/inviteText.test.ts lib/submitOutcome.test.ts`
Expected: FAIL — cannot resolve `./links` or `./inviteText`, and the three new `submitOutcome` cases fail.

- [ ] **Step 3: Implement the link builders**

Create `lib/links.ts`:

```ts
/**
 * The frontend owns the shape of every shareable URL -- the backend's
 * placeholder share URL is ignored. Tokens and ids are opaque data from the
 * wire, so they are encoded on the way into a path rather than trusted as URL
 * syntax.
 */

const INVITE_BASE = "/compatibility-test/invite";
const PAIR_BASE = "/compatibility-test/pair";

export function inviteHref(token: string): string {
  return `${INVITE_BASE}/${encodeURIComponent(token)}`;
}

/**
 * Where a responder lands. Their own share token rides along in the query so
 * they can invite someone onward without re-taking the quiz -- a capability
 * meant to be handed out, in the one place a page navigation preserves.
 */
export function pairHref(pairId: string, shareToken?: string | null): string {
  const path = `${PAIR_BASE}/${encodeURIComponent(pairId)}`;
  if (!shareToken) return path;
  return `${path}?share=${encodeURIComponent(shareToken)}`;
}

/**
 * Next hands a query value over as `string | string[] | undefined` -- repeated
 * keys arrive as an array. An empty value is the same as none.
 */
export function readShareParam(
  value: string | string[] | undefined,
): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" && first !== "" ? first : null;
}
```

- [ ] **Step 4: Implement the name helper**

Create `lib/inviteText.ts`:

```ts
/** Long enough for a real name, short enough to leave the headline readable. */
const MAX_NAME_LENGTH = 32;

/**
 * The sender's name is whatever they typed into a form, and it goes straight
 * into a headline. React escapes it, so there is nothing to sanitise for
 * safety -- this is about shape: tidy the whitespace, cap the length, and
 * never address an empty string.
 */
export function displayName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name === "") return "Someone";
  if (name.length <= MAX_NAME_LENGTH) return name;
  return `${name.slice(0, MAX_NAME_LENGTH - 1)}…`;
}

/** Drops the tidied name into every `{name}` slot in a copy string. */
export function withName(template: string, raw: string): string {
  return template.replaceAll("{name}", displayName(raw));
}
```

- [ ] **Step 5: Add the responder branch to the submit decision**

Replace the whole contents of `lib/submitOutcome.ts`:

```ts
/**
 * The pure decision at the heart of `submit()` in `CompatibilityTest.tsx`:
 * given what `/api/answers` answered, where does the visitor land? Pulled out
 * so it can be tested without a DOM.
 */
export type SubmitDecision =
  | { phase: "share"; token: string }
  | { phase: "pair"; pairId: string; shareToken: string }
  | { phase: "details"; error: string };

export function decideSubmitOutcome(
  ok: boolean,
  body: { share_token?: string; pair_id?: string; error?: string } | null,
  fallbackError: string,
): SubmitDecision {
  // A pair id means a second person just completed the pair. That result is
  // the destination, and it outranks the share link the same response carries
  // -- the pair page offers the link once they are there.
  if (ok && body?.pair_id) {
    return { phase: "pair", pairId: body.pair_id, shareToken: body.share_token ?? "" };
  }
  if (ok && body?.share_token) {
    return { phase: "share", token: body.share_token };
  }
  const error = body?.error ? body.error : fallbackError;
  return { phase: "details", error };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test lib/links.test.ts lib/inviteText.test.ts lib/submitOutcome.test.ts`
Expected: PASS (9 + 6 + 9 tests)

- [ ] **Step 7: Typecheck**

Run: `bunx tsc --noEmit && echo "typecheck clean"`
Expected: `typecheck clean`

- [ ] **Step 8: Commit**

```bash
git add lib/links.ts lib/links.test.ts lib/inviteText.ts lib/inviteText.test.ts lib/submitOutcome.ts lib/submitOutcome.test.ts
git commit -m "feat: decide where a responder lands, and own the link shapes"
```

---

### Task 4: Copy and styles for the responder's screens

**Files:**
- Modify: `content.ts:386-423` (inside the `compatibilityTest` block)
- Modify: `content.test.ts` (the `compatibility test content` describe block)
- Modify: `app/globals.css` (append before the `@media (prefers-reduced-motion: reduce)` block at line 1037)

**Interfaces:**
- Produces (Tasks 5–9 read these exact paths):
  - `content.compatibilityTest.invite = { eyebrow, headline, sub, cta }` — `headline` and `cta` contain a `{name}` slot filled by `withName`
  - `content.compatibilityTest.inviteError = { expired, unknown, unavailable, cta }`, where each of the first three is `{ eyebrow, headline, body }`
  - `content.compatibilityTest.pair = { eyebrow, sharedLabel, noShared, differenceLabel, traits: { humour, opensUp, pace, lifeStage }, shareHeadline, shareSub, restart, missing, unavailable }`
- Unchanged: `intro`, `helpers`, `loaderPhrases`, `details`, `share`. `content.test.ts` asserts `details` and `share` with exact `toEqual`, so **do not add keys to either**.
- New CSS classes: `.ctest-pair`, `.ctest-section-label`, `.ctest-people`, `.ctest-person-name`, `.ctest-values`, `.ctest-value-name`, `.ctest-value-tagline`, `.ctest-value-blurb`, `.ctest-traits`, `.ctest-trait`, `.ctest-trait-label`, `.ctest-trait-value`.

**Why `{name}` and not string concatenation:** the sender's name lands in two
different sentences. A slot in the copy keeps both sentences readable in
`content.ts`, where the copy is reviewed, instead of assembled in a component.

- [ ] **Step 1: Add the three copy blocks**

In `content.ts`, inside `compatibilityTest`, insert these three blocks after the
`share: { … },` block and before the closing `},` of `compatibilityTest`:

```ts
    invite: {
      eyebrow: "You've been invited",
      // {name} is filled by withName() -- trimmed and length-capped there.
      headline: "{name} wants to know how you two connect.",
      sub: "The same twenty questions they answered, about four minutes. Answer them and you'll both see the result.",
      cta: "Answer {name}'s questions",
    },
    inviteError: {
      expired: {
        eyebrow: "Link expired",
        headline: "This invitation has run out.",
        body: "Invitations last thirty days. Ask whoever sent it for a fresh link — or start a thread of your own.",
      },
      unknown: {
        eyebrow: "Link not found",
        headline: "We can't find that invitation.",
        body: "The link may have been mistyped or cut short somewhere along the way. Ask for it again, or start a thread of your own.",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. The link is still good — try it again shortly.",
      },
      cta: "Start your own",
    },
    pair: {
      eyebrow: "Your compatibility",
      sharedLabel: "What you both lead with",
      noShared: "You don't share a top value — which is its own kind of interesting.",
      differenceLabel: "Where you differ",
      traits: {
        humour: "Humour",
        opensUp: "Opens up",
        pace: "Pace",
        lifeStage: "Life stage",
      },
      shareHeadline: "Now send yours to someone else.",
      shareSub: "The same twenty questions, a different person, a different result.",
      restart: "Take it yourself",
      missing: {
        eyebrow: "Not found",
        headline: "We can't find that result.",
        body: "The link may have been mistyped or cut short. Ask whoever shared it to send it again.",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. Try the link again shortly.",
      },
    },
```

- [ ] **Step 2: Assert the copy in `content.test.ts`**

Append these tests inside the existing `describe("compatibility test content", …)` block:

These use exact `toEqual`, matching how the existing `details` and `share`
blocks are asserted in the same file. Copy is reviewed content: a blanked or
mangled string should fail a test, and `toBeTruthy()` would let it through.

```ts
  test("the invite intro matches the approved copy exactly", () => {
    expect(content.compatibilityTest.invite).toEqual({
      eyebrow: "You've been invited",
      // withName() fills these slots; a lost slot would greet nobody.
      headline: "{name} wants to know how you two connect.",
      sub: "The same twenty questions they answered, about four minutes. Answer them and you'll both see the result.",
      cta: "Answer {name}'s questions",
    });
  });

  test("a dead invite says which way it died", () => {
    expect(content.compatibilityTest.inviteError).toEqual({
      expired: {
        eyebrow: "Link expired",
        headline: "This invitation has run out.",
        body: "Invitations last thirty days. Ask whoever sent it for a fresh link — or start a thread of your own.",
      },
      unknown: {
        eyebrow: "Link not found",
        headline: "We can't find that invitation.",
        body: "The link may have been mistyped or cut short somewhere along the way. Ask for it again, or start a thread of your own.",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. The link is still good — try it again shortly.",
      },
      cta: "Start your own",
    });
  });

  test("the pair screen matches the approved copy exactly", () => {
    expect(content.compatibilityTest.pair).toEqual({
      eyebrow: "Your compatibility",
      sharedLabel: "What you both lead with",
      noShared: "You don't share a top value — which is its own kind of interesting.",
      differenceLabel: "Where you differ",
      traits: {
        humour: "Humour",
        opensUp: "Opens up",
        pace: "Pace",
        lifeStage: "Life stage",
      },
      shareHeadline: "Now send yours to someone else.",
      shareSub: "The same twenty questions, a different person, a different result.",
      restart: "Take it yourself",
      missing: {
        eyebrow: "Not found",
        headline: "We can't find that result.",
        body: "The link may have been mistyped or cut short. Ask whoever shared it to send it again.",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. Try the link again shortly.",
      },
    });
  });

  test("every trait the backend sends has a label", () => {
    // The four keys personTraits() reads. A renamed key would silently drop a
    // line from every person card.
    expect(Object.keys(content.compatibilityTest.pair.traits).sort()).toEqual([
      "humour",
      "lifeStage",
      "opensUp",
      "pace",
    ]);
  });
```

- [ ] **Step 3: Run the content tests**

Run: `bun test content.test.ts`
Expected: PASS

- [ ] **Step 4: Add the pair-result styles**

In `app/globals.css`, insert immediately before the
`@media (prefers-reduced-motion: reduce) {` block:

```css
.ctest-pair {
  display: grid;
  width: min(46rem, 100%);
  gap: clamp(1.5rem, 4vh, 2.5rem);
  margin-top: clamp(1rem, 3vh, 2rem);
}

.ctest-section-label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink) 48%, transparent);
}

.ctest-people { display: grid; gap: 1rem; grid-template-columns: 1fr; }
@media (min-width: 720px) { .ctest-people { grid-template-columns: 1fr 1fr; } }

.ctest-person-name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--color-ink);
  /* A name is whatever someone typed; it must not push the card wider. */
  overflow-wrap: anywhere;
}

.ctest-values { display: grid; gap: 0.85rem; margin: 0; padding: 0; list-style: none; }
.ctest-value-name { font-weight: 600; color: var(--color-ink); }
.ctest-value-tagline { color: color-mix(in srgb, var(--color-ink) 62%, transparent); }
.ctest-value-blurb {
  margin-top: 0.25rem;
  font-size: 0.9rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--color-ink) 66%, transparent);
}

.ctest-traits { display: grid; gap: 0.6rem; margin: 0; }
.ctest-trait { display: grid; gap: 0.1rem; }
.ctest-trait-label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink) 44%, transparent);
}
.ctest-trait-value { margin: 0; font-size: 0.95rem; color: var(--color-ink); }
```

- [ ] **Step 5: Confirm nothing stale slipped in**

```bash
grep -rn "ctest-dot\|compatibilityTest.result" --include="*.ts" --include="*.tsx" --include="*.css" . --exclude-dir=node_modules --exclude-dir=docs || echo "no stale references"
```

Expected: `no stale references`

- [ ] **Step 6: Run the full suite and typecheck**

Run: `bun test 2>&1 | tail -4 && bunx tsc --noEmit && echo "typecheck clean"`
Expected: `4 fail` (the known four), everything else passing, then `typecheck clean`.

- [ ] **Step 7: Commit**

```bash
git add content.ts content.test.ts app/globals.css
git commit -m "feat: write the invite, dead-link and pair-result copy"
```

---

### Task 5: The shared screen furniture

Three screens now share a backdrop (the quiz, the notices, the pair result) and
two share a copyable link (the originator's share screen and the responder's
pair result). Extracting both before building the new screens is what stops the
third copy of each from appearing.

**Files:**
- Create: `components/compatibility/CtestShell.tsx`
- Create: `components/compatibility/CompatibilityNotice.tsx`
- Test: `components/compatibility/CompatibilityNotice.test.tsx`
- Create: `components/compatibility/ShareLink.tsx`
- Test: `components/compatibility/ShareLink.test.tsx`
- Modify: `components/compatibility/ShareScreen.tsx` (whole file)
- Modify: `components/compatibility/CompatibilityTest.tsx:163-171` and the closing `</div>` at line 310

**Interfaces:**
- Consumes: `inviteHref` (Task 3), `content.compatibilityTest.share` and `.inviteError` (Task 4), `PremiumButton`.
- Produces:
  - `CtestShell({ children }: { children: ReactNode })`
  - `CompatibilityNotice({ eyebrow, headline, body, cta }: { eyebrow: string; headline: string; body: string; cta?: { href: string; label: string } })`
  - `ShareLink({ token, secondary }: { token: string; secondary?: ReactNode })`
- `ShareScreen`'s own props are unchanged: `{ shareToken: string; onRestart: () => void }`.

**Why `CtestShell` has no `"use client"`:** it renders no state and no handlers,
so it works as a Server Component inside the two new pages. A client component
importing it simply pulls it into the client bundle — the direction that is
allowed. The reverse (a server component inside a client one) is not, which is
why `ShareLink` keeps its own `"use client"`.

**Why `ShareLink` takes a `secondary` node:** the copy button sits in a row with
a different neighbour on each screen — a "Start over" button on the share
screen, nothing on the pair result. Passing the neighbour in keeps one row
definition instead of two.

- [ ] **Step 1: Write the failing tests**

Create `components/compatibility/CompatibilityNotice.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompatibilityNotice } from "./CompatibilityNotice";

test("a notice says what happened and sits in the quiz shell", () => {
  const html = renderToStaticMarkup(
    <CompatibilityNotice
      eyebrow="Link expired"
      headline="This invitation has run out."
      body="Ask for a fresh link."
    />,
  );
  expect(html).toContain("Link expired");
  expect(html).toContain("This invitation has run out.");
  expect(html).toContain("Ask for a fresh link.");
  expect(html).toContain("ctest-shell");
  expect(html).toContain("ctest-home");
});

test("a notice offers a way out only when one is given", () => {
  const without = renderToStaticMarkup(
    <CompatibilityNotice eyebrow="e" headline="h" body="b" />,
  );
  expect(without).not.toContain("/compatibility-test");

  const withCta = renderToStaticMarkup(
    <CompatibilityNotice
      eyebrow="e"
      headline="h"
      body="b"
      cta={{ href: "/compatibility-test", label: "Start your own" }}
    />,
  );
  // PremiumButton splits its label into per-glyph spans; aria-label carries it whole.
  expect(withCta).toContain('aria-label="Start your own"');
  expect(withCta).toContain('href="/compatibility-test"');
});
```

Create `components/compatibility/ShareLink.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareLink } from "./ShareLink";
import { content } from "@/content";

test("share link renders the invite path and a copy button", () => {
  const html = renderToStaticMarkup(<ShareLink token="tok-1" />);
  expect(html).toContain("/compatibility-test/invite/tok-1");
  expect(html).toContain(`aria-label="${content.compatibilityTest.share.copy}"`);
});

test("share link encodes a token that would otherwise change the path", () => {
  const html = renderToStaticMarkup(<ShareLink token="a/b" />);
  expect(html).toContain("/compatibility-test/invite/a%2Fb");
});

test("share link places a neighbour beside the copy button when given one", () => {
  const html = renderToStaticMarkup(
    <ShareLink token="tok-1" secondary={<button type="button">Start over</button>} />,
  );
  expect(html).toContain("Start over");
});

test("share link announces the copy politely", () => {
  const html = renderToStaticMarkup(<ShareLink token="tok-1" />);
  expect(html).toContain('aria-live="polite"');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test components/compatibility/CompatibilityNotice.test.tsx components/compatibility/ShareLink.test.tsx`
Expected: FAIL — cannot resolve `./CompatibilityNotice` or `./ShareLink`.

- [ ] **Step 3: Implement the shell**

Create `components/compatibility/CtestShell.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The furniture every compatibility screen sits in: the bone backdrop, the two
 * ambient blooms, and the way back to the site. Shared so the quiz, the
 * notices and the pair result cannot drift apart.
 *
 * Deliberately not a client component -- the two new pages render it on the
 * server, and a client component importing it is the direction React allows.
 */
export function CtestShell({ children }: { children: ReactNode }) {
  return (
    <div className="ctest-shell">
      <span aria-hidden className="ctest-ambient ctest-ambient--ember" />
      <span aria-hidden className="ctest-ambient ctest-ambient--signal" />
      <Link className="ctest-home" href="/">
        <span aria-hidden>&larr;</span> Weft
      </Link>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Implement the notice**

Create `components/compatibility/CompatibilityNotice.tsx`:

```tsx
import { CtestShell } from "@/components/compatibility/CtestShell";
import { PremiumButton } from "@/components/ui/PremiumButton";

/**
 * A dead end with an explanation: an expired invite, a link that never
 * existed, a backend having a moment.
 *
 * Deliberately not `notFound()`. A 410 and a 404 mean different things to the
 * person holding the link -- one can ask for a fresh one, the other should
 * check what they pasted -- and neither is served by a generic not-found page.
 * The HTTP status stays 200; the words are what carry the meaning here.
 */
export function CompatibilityNotice({
  eyebrow,
  headline,
  body,
  cta,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <CtestShell>
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="ctest-eyebrow">{eyebrow}</span>
        <h1 className="ctest-prompt">{headline}</h1>
        <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-ink/60">
          {body}
        </p>
        {cta && (
          <div className="mt-8">
            <PremiumButton href={cta.href} tone="ember">
              {cta.label}
            </PremiumButton>
          </div>
        )}
      </div>
    </CtestShell>
  );
}
```

- [ ] **Step 5: Implement the share link**

Create `components/compatibility/ShareLink.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { content } from "@/content";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { inviteHref } from "@/lib/links";

const COPIED_MS = 2000;

// The origin never changes for the life of the document, so nothing ever
// notifies -- but subscribe must be referentially stable.
const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const readOriginOnServer = () => "";

/**
 * A share token, rendered as a link someone can copy. The link's shape is the
 * frontend's to own, so it is built from the token rather than taken from the
 * backend's placeholder share URL. `window.location.origin` is only readable
 * after mount, so the server-rendered markup carries the path alone and the
 * host fills in on hydration.
 */
export function ShareLink({
  token,
  secondary,
}: {
  token: string;
  secondary?: ReactNode;
}) {
  const copy = content.compatibilityTest.share;
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readOriginOnServer);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const shareUrl = `${origin}${inviteHref(token)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard unavailable -- the link stays on screen to copy by hand.
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <div className="flex w-full flex-col items-center">
      <p className="ctest-linkbox mt-7">{shareUrl.replace(/^https?:\/\//, "")}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <PremiumButton onClick={copyLink} tone="ember">
          {copied ? copy.copied : copy.copy}
        </PremiumButton>
        {secondary}
      </div>
      <p aria-live="polite" className="ctest-copied mt-4 h-4">
        {copied ? copy.announce : ""}
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Compose it from the share screen**

Replace the whole contents of `components/compatibility/ShareScreen.tsx`:

```tsx
"use client";

import { content } from "@/content";
import { ShareLink } from "@/components/compatibility/ShareLink";

/**
 * Everything an originator gets: a link, and the reason to send it. No profile
 * and no score -- those only exist once a second person has answered.
 */
export function ShareScreen({
  shareToken,
  onRestart,
}: {
  shareToken: string;
  onRestart: () => void;
}) {
  const copy = content.compatibilityTest.share;

  return (
    <div className="relative z-10 flex w-full flex-col items-center text-center">
      <span className="ctest-eyebrow">{copy.eyebrow}</span>
      <h2 className="ctest-prompt">{copy.headline}</h2>
      <p className="mt-3 max-w-md text-pretty text-base leading-relaxed text-ink/62">
        {copy.sub}
      </p>

      <ShareLink
        token={shareToken}
        secondary={
          <button
            className="font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
            onClick={onRestart}
            type="button"
          >
            {copy.restart}
          </button>
        }
      />

      <p className="mt-2 max-w-sm font-mono text-[0.68rem] leading-relaxed text-ink/45">
        {copy.note}
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Put the quiz in the shared shell**

In `components/compatibility/CompatibilityTest.tsx`, replace the opening of the
returned markup — the `<div className="ctest-shell">` through the closing
`</Link>` (lines 164–169) — with `<CtestShell>`, and replace the matching
closing `</div>` at the end of the component (line 310) with `</CtestShell>`.

Then delete the now-unused `Link` import (line 4) and add:

```tsx
import { CtestShell } from "@/components/compatibility/CtestShell";
```

The result: `return (<CtestShell><AnimatePresence mode="wait">…</AnimatePresence></CtestShell>);`

- [ ] **Step 8: Run the tests to verify they pass**

Run: `bun test components/compatibility/`
Expected: PASS — the two new files (6 tests), plus `ShareScreen.test.tsx`,
`DetailsForm.test.tsx` and `CompatibilityTest.test.tsx` still green. The
existing `ShareScreen` assertions on `/compatibility-test/invite/tok-1` and
`ctest-home` still hold, because the markup they check moved rather than changed.

- [ ] **Step 9: Typecheck**

Run: `bunx tsc --noEmit && echo "typecheck clean"`
Expected: `typecheck clean`

- [ ] **Step 10: Commit**

```bash
git add components/compatibility/CtestShell.tsx components/compatibility/CompatibilityNotice.tsx components/compatibility/CompatibilityNotice.test.tsx components/compatibility/ShareLink.tsx components/compatibility/ShareLink.test.tsx components/compatibility/ShareScreen.tsx components/compatibility/CompatibilityTest.tsx
git commit -m "refactor: share the quiz shell and the copyable link"
```

---

### Task 6: The quiz learns to be answered by a friend

The responder takes the *same* quiz: same options, same auto-advance, same
pick-two gating, same details form, same double-submit guard. Only three things
differ — who the intro addresses, whether the submission carries an
`invite_token`, and where a successful submission lands. So this is a prop on
the existing component, not a second component.

**Files:**
- Modify: `components/compatibility/CompatibilityTest.tsx` (imports, props, `submit`, the intro block)
- Modify: `components/compatibility/CompatibilityTest.test.tsx` (append three tests)

**Interfaces:**
- Consumes: `withName` (Task 3), `pairHref` (Task 3), `decideSubmitOutcome` with its new `"pair"` branch (Task 3), `content.compatibilityTest.invite` (Task 4).
- Produces: `CompatibilityTest({ questions, invite }: { questions: QuizQuestion[]; invite?: { token: string; fromName: string } })` — Tasks 8 reads this exact shape.

**Why `window.location.assign` and not `router.push`:** the pair page is
`force-dynamic` SSR, so a full navigation gets the freshly rendered result
rather than a client transition into a page that must fetch anyway. It also
keeps this component renderable outside an App Router context — `useRouter()`
throws there, and every component test in this repo renders exactly that way.
The call sits inside an event handler, never during render.

**Why the in-flight ref is *not* released on the pair branch:** `AnimatePresence`
in `"wait"` mode keeps the details form mounted through its exit transition, and
a full navigation takes a moment to commit. Releasing the guard in `finally`
would leave the submit button live during that window, and a second POST creates
a second session and a second pair. The guard stays set until the page is gone.

- [ ] **Step 1: Write the failing tests**

Append to `components/compatibility/CompatibilityTest.test.tsx`:

```tsx
const INVITE = { token: "tok-1", fromName: "  Ana  " };

test("an invited friend is greeted by the sender's name", () => {
  const html = renderToStaticMarkup(
    <CompatibilityTest questions={QUESTIONS} invite={INVITE} />,
  );
  expect(html).toContain(content.compatibilityTest.invite.eyebrow);
  // withName trims the name and fills every {name} slot.
  expect(html).toContain("Ana wants to know how you two connect.");
  expect(html).toContain('aria-label="Answer Ana&#x27;s questions"');
  expect(html).not.toContain("{name}");
});

test("the invited intro replaces the originator's, rather than joining it", () => {
  const html = renderToStaticMarkup(
    <CompatibilityTest questions={QUESTIONS} invite={INVITE} />,
  );
  expect(html).not.toContain(content.compatibilityTest.intro.headline[0]);
});

test("without an invite the originator intro is unchanged", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain(content.compatibilityTest.intro.headline[0]);
  expect(html).not.toContain(content.compatibilityTest.invite.eyebrow);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test components/compatibility/CompatibilityTest.test.tsx`
Expected: FAIL — `invite` is not a prop and the invite copy never renders.

- [ ] **Step 3: Add the imports and the prop**

In `components/compatibility/CompatibilityTest.tsx`, add to the imports:

```tsx
import { withName } from "@/lib/inviteText";
import { pairHref } from "@/lib/links";
```

Change the component signature from:

```tsx
export function CompatibilityTest({ questions }: { questions: QuizQuestion[] }) {
```

to:

```tsx
/**
 * The whole quiz, for either person. `invite` is what makes the difference:
 * present means this visitor arrived on someone's link, so the intro addresses
 * the sender, the submission carries their token, and finishing produces a
 * pair result instead of a share link.
 */
export function CompatibilityTest({
  questions,
  invite,
}: {
  questions: QuizQuestion[];
  invite?: { token: string; fromName: string };
}) {
```

- [ ] **Step 4: Derive the intro**

Immediately after `const required = question?.select ?? 1;`, add:

```tsx
  // One intro, two audiences. Computed here so the markup below stays a single
  // block rather than two near-identical ones.
  const intro = invite
    ? {
        eyebrow: data.invite.eyebrow,
        headline: [withName(data.invite.headline, invite.fromName)] as readonly string[],
        sub: data.invite.sub,
        cta: withName(data.invite.cta, invite.fromName),
      }
    : data.intro;
```

Then in the `phase === "intro"` block, replace every `data.intro.` with `intro.`
— four references: `intro.eyebrow`, `intro.headline.map(…)`, `intro.sub`, and
`intro.cta`.

- [ ] **Step 5: Carry the token and land on the pair**

In `submit`, replace the body of the `try` block. The whole function becomes:

```tsx
  async function submit(nextDetails: Details) {
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    setBusy(true);

    setDetails(nextDetails);
    setSubmitError(null);

    // Backstop only: per-question gating (the auto-advance on single-choice,
    // the disabled Next on pick-two) should already keep every question
    // answered by the time the visitor reaches the details form. If it
    // somehow doesn't, send them back to the first gap instead of letting
    // the backend's 400 -- which names no question -- strand them here.
    const firstGapIndex = firstUnansweredIndex(answers, questions);
    if (firstGapIndex !== -1) {
      setActiveIndex(firstGapIndex);
      setPhase("quiz");
      setSubmitError(data.details.incomplete);
      submitInFlight.current = false;
      setBusy(false);
      return;
    }

    setPhase("submitting");
    // Set on the one path that leaves this page. The in-flight guard is
    // deliberately left engaged while the navigation commits -- releasing it
    // would let a second click POST a second pair into existence.
    let leaving = false;
    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextDetails,
          answers: toBackendAnswers(answers, questions),
          ...(invite ? { invite_token: invite.token } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { share_token?: string; pair_id?: string; error?: string }
        | null;

      const outcome = decideSubmitOutcome(response.ok, body, data.details.failed);
      if (outcome.phase === "pair") {
        leaving = true;
        // A full navigation: the pair page is force-dynamic SSR, so this
        // fetches the rendered result rather than transitioning into a page
        // that would have to fetch anyway. The loader stays up until it lands.
        window.location.assign(pairHref(outcome.pairId, outcome.shareToken));
        return;
      }
      if (outcome.phase === "share") {
        setShareToken(outcome.token);
        setPhase("share");
      } else {
        setSubmitError(outcome.error);
        setPhase("details");
      }
    } catch {
      // Offline or the request never landed -- nothing was created, so the
      // form comes back with the answers still in state.
      setSubmitError(data.details.failed);
      setPhase("details");
    } finally {
      if (!leaving) {
        submitInFlight.current = false;
        setBusy(false);
      }
    }
  }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test components/compatibility/`
Expected: PASS — 3 new tests plus the existing ones.

- [ ] **Step 7: Typecheck**

Run: `bunx tsc --noEmit && echo "typecheck clean"`
Expected: `typecheck clean`

- [ ] **Step 8: Commit**

```bash
git add components/compatibility/CompatibilityTest.tsx components/compatibility/CompatibilityTest.test.tsx
git commit -m "feat: let the quiz be answered on someone else's invite"
```

---

### Task 7: The two-person result

**Files:**
- Create: `lib/pairView.ts`
- Test: `lib/pairView.test.ts`
- Create: `components/compatibility/PairResultView.tsx`
- Test: `components/compatibility/PairResultView.test.tsx`

**Interfaces:**
- Consumes: `PairResult` / `PairPerson` / `ValueEntry` (Phase 1), `CtestShell` and `ShareLink` (Task 5), `content.compatibilityTest.pair` (Task 4), `PremiumButton`.
- Produces:
  - `type Trait = { label: string; value: string }`
  - `type TraitLabels = { humour: string; opensUp: string; pace: string; lifeStage: string }`
  - `personTraits(person: PairPerson, labels: TraitLabels): Trait[]`
  - `PairResultView({ result, shareToken }: { result: PairResult; shareToken: string | null })`

**Why both people are named rather than labelled "you" and "them":** `people[0]`
is the sender and `people[1]` the responder, positionally — but the payload
carries no session id, so nothing in it says which of the two is *reading* it.
Guessing would be wrong half the time on a link that has been forwarded. Naming
both is correct for every viewer.

**Why unmeasured traits are dropped:** the backend fills a trait it could not
measure with the literal `"—"` (humour) or `"unspecified"` (life stage).
Printing "Humour —" reads like a rendering bug.

- [ ] **Step 1: Write the failing tests**

Create `lib/pairView.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { personTraits } from "./pairView";
import type { PairPerson } from "./weftTypes";

const LABELS = {
  humour: "Humour",
  opensUp: "Opens up",
  pace: "Pace",
  lifeStage: "Life stage",
};

const PERSON: PairPerson = {
  name: "Ana",
  top_values: [],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

describe("personTraits", () => {
  test("lists every measured trait, labelled and in order", () => {
    expect(personTraits(PERSON, LABELS)).toEqual([
      { label: "Humour", value: "warm/affiliative" },
      { label: "Opens up", value: "opens up quickly" },
      { label: "Pace", value: "likes a steady rhythm" },
      { label: "Life stage", value: "rooting" },
    ]);
  });

  test("drops the em-dash the backend uses for unmeasured humour", () => {
    const traits = personTraits({ ...PERSON, humour: "—" }, LABELS);
    expect(traits).toHaveLength(3);
    expect(traits[0].label).toBe("Opens up");
  });

  test("drops an unspecified life stage", () => {
    const traits = personTraits({ ...PERSON, life_stage: "unspecified" }, LABELS);
    expect(traits).toHaveLength(3);
  });

  test("drops a blank the backend should not have sent", () => {
    expect(personTraits({ ...PERSON, pace: "   " }, LABELS)).toHaveLength(3);
  });

  test("a person we could not read at all has nothing to show", () => {
    const blank = {
      ...PERSON,
      humour: "—",
      opens_up: "",
      pace: "",
      life_stage: "unspecified",
    };
    expect(personTraits(blank, LABELS)).toEqual([]);
  });
});
```

Create `components/compatibility/PairResultView.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PairResultView } from "./PairResultView";
import { content } from "@/content";
import type { PairResult } from "@/lib/weftTypes";

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "care up close",
  blurb: "You look after the people in front of you.",
};

const RESULT: PairResult = {
  headline: "Ana and Ben both lead with Benevolence.",
  band: "A real mix — some deep overlap, some genuine difference.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [
    {
      name: "Ana",
      top_values: [VALUE],
      humour: "warm/affiliative",
      opens_up: "opens up quickly",
      pace: "likes a steady rhythm",
      life_stage: "rooting",
    },
    {
      name: "Ben",
      top_values: [VALUE],
      humour: "—",
      opens_up: "opens up slowly",
      pace: "likes space between",
      life_stage: "unspecified",
    },
  ],
};

test("the result leads with the headline and the band", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain(RESULT.headline);
  expect(html).toContain(RESULT.band);
  expect(html).toContain(RESULT.difference);
  expect(html).toContain("ctest-shell");
});

test("both people appear, named, with their values", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain("Ana");
  expect(html).toContain("Ben");
  expect(html).toContain(VALUE.tagline);
  expect(html).toContain(VALUE.blurb);
});

test("a trait the backend could not measure is not printed", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  // Ben has no humour reading and no life stage.
  expect(html).not.toContain("unspecified");
  expect(html).toContain(content.compatibilityTest.pair.traits.opensUp);
});

test("two people with nothing in common still get a sentence", () => {
  const html = renderToStaticMarkup(
    <PairResultView result={{ ...RESULT, shared_values: [] }} shareToken={null} />,
  );
  expect(html).toContain(
    content.compatibilityTest.pair.noShared.replace(/'/g, "&#x27;"),
  );
});

test("a responder is offered a link of their own", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  expect(html).toContain(content.compatibilityTest.pair.shareHeadline);
  expect(html).toContain("/compatibility-test/invite/tok-9");
});

test("without a token the page offers the quiz instead of a dead link", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).not.toContain("/compatibility-test/invite/");
  expect(html).toContain(
    `aria-label="${content.compatibilityTest.pair.restart}"`,
  );
});

test("the result never leaks a score", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  // The backend sends words, not numbers; nothing here should invent one.
  expect(html).not.toContain("ctest-meter");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/pairView.test.ts components/compatibility/PairResultView.test.tsx`
Expected: FAIL — cannot resolve `./pairView` or `./PairResultView`.

- [ ] **Step 3: Implement the trait reader**

Create `lib/pairView.ts`:

```ts
import type { PairPerson } from "@/lib/weftTypes";

export type Trait = { label: string; value: string };

export type TraitLabels = {
  humour: string;
  opensUp: string;
  pace: string;
  lifeStage: string;
};

/**
 * What the backend sends when it could not read a trait. `"—"` is the literal
 * em-dash `_tidy()` falls back to for humour; `"unspecified"` is the life-stage
 * equivalent.
 */
const UNMEASURED = new Set(["—", "unspecified", ""]);

/**
 * The descriptive lines for one person, with the blanks dropped. Printing
 * "Humour —" reads like a rendering bug, so an unmeasured trait is simply not
 * shown.
 */
export function personTraits(person: PairPerson, labels: TraitLabels): Trait[] {
  return [
    { label: labels.humour, value: person.humour },
    { label: labels.opensUp, value: person.opens_up },
    { label: labels.pace, value: person.pace },
    { label: labels.lifeStage, value: person.life_stage },
  ].filter((trait) => !UNMEASURED.has(trait.value.trim()));
}
```

- [ ] **Step 4: Implement the result screen**

Create `components/compatibility/PairResultView.tsx`:

```tsx
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test lib/pairView.test.ts components/compatibility/PairResultView.test.tsx`
Expected: PASS (5 + 7 tests)

- [ ] **Step 6: Typecheck**

Run: `bunx tsc --noEmit && echo "typecheck clean"`
Expected: `typecheck clean`

- [ ] **Step 7: Commit**

```bash
git add lib/pairView.ts lib/pairView.test.ts components/compatibility/PairResultView.tsx components/compatibility/PairResultView.test.tsx
git commit -m "feat: show the compatibility result and both fuller profiles"
```

---

### Task 8: The friend landing page

**Files:**
- Create: `app/compatibility-test/invite/[token]/page.tsx`
- Test: `app/compatibility-test/invite/[token]/page.test.tsx`

**Interfaces:**
- Consumes: `loadInvite` (Task 2), `toQuizQuestions` (Phase 2), `CompatibilityTest` with its `invite` prop (Task 6), `CompatibilityNotice` (Task 5), `content.compatibilityTest.inviteError` (Task 4).
- Produces: the route `/compatibility-test/invite/[token]`.

**Why the questions come from the invite, never from `loadBank()`:** the invite
carries the *sender's* question set. Loading the current bank instead would let
an edit to `weft_core` leave the two people answering different questions, and
the backend would reject the submission with `Q7 is not in the served set`.

**Why `robots: { index: false }`:** an invite URL is a capability — anyone
holding it can answer as the friend. Letting a crawler index one would hand it
to everyone.

**On test coverage:** these page tests cover the failure wiring and the
metadata, because the happy path needs a live upstream and the page takes no
injectable fetch. The happy path is covered where it can be: `loadInvite` with a
stubbed fetch (Task 2), `CompatibilityTest` in responder mode (Task 6), and the
manual round trip in Task 10. This mirrors how `app/compatibility-test/page.test.tsx`
is already tested.

- [ ] **Step 1: Write the failing test**

Create `app/compatibility-test/invite/[token]/page.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Page, { metadata } from "./page";
import { content } from "@/content";

test("an unreachable backend explains itself instead of crashing", async () => {
  // bun runs the whole suite in one process and other files set this, so the
  // outage being tested has to be arranged explicitly.
  delete process.env.WEFT_API_URL;

  const html = renderToStaticMarkup(
    await Page({ params: Promise.resolve({ token: "tok-1" }) }),
  );

  expect(html).toContain(content.compatibilityTest.inviteError.unavailable.headline);
  expect(html).toContain("ctest-shell");
  // Nothing to answer, so no quiz.
  expect(html).not.toContain("ctest-option");
});

test("an empty token is a not-found without asking the backend", async () => {
  delete process.env.WEFT_API_URL;

  const html = renderToStaticMarkup(
    await Page({ params: Promise.resolve({ token: "" }) }),
  );

  expect(html).toContain(content.compatibilityTest.inviteError.unknown.headline);
});

test("an invite is never indexed", () => {
  // The URL is a capability. A crawler holding one would hand it to everyone.
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test app/compatibility-test/invite/`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Implement**

Create `app/compatibility-test/invite/[token]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CompatibilityTest } from "@/components/compatibility/CompatibilityTest";
import { CompatibilityNotice } from "@/components/compatibility/CompatibilityNotice";
import { content } from "@/content";
import { toQuizQuestions } from "@/lib/compatibilityQuestions";
import { loadInvite } from "@/lib/server/invite";

export const metadata: Metadata = {
  title: "Weft: You've been invited",
  description:
    "Someone wants to know how the two of you connect. Twenty questions, about four minutes.",
  // An invite URL is a capability -- anyone holding it can answer as the
  // friend. Indexing one would hand it to everyone. The sender's name is
  // deliberately absent here too: it would take a second fetch and would
  // unfurl their name into every chat the link is pasted into.
  robots: { index: false, follow: false },
};

// Per-token data with a 30-day life. Nothing here is safe to prerender.
export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const outcome = await loadInvite(token);
  const errors = content.compatibilityTest.inviteError;

  if (outcome.status !== "ok") {
    const notice =
      outcome.status === "expired"
        ? errors.expired
        : outcome.status === "not_found"
          ? errors.unknown
          : errors.unavailable;

    return (
      <main id="main-content">
        <CompatibilityNotice
          eyebrow={notice.eyebrow}
          headline={notice.headline}
          body={notice.body}
          // An outage is temporary and the link is still good, so the only way
          // out offered there is to try again -- not to abandon the invite.
          cta={
            outcome.status === "unavailable"
              ? undefined
              : { href: "/compatibility-test", label: errors.cta }
          }
        />
      </main>
    );
  }

  return (
    <main id="main-content">
      <CompatibilityTest
        // The sender's own questions, not the current bank: a later bank edit
        // must not leave the two of them answering different things.
        questions={toQuizQuestions(outcome.invite.questions)}
        invite={{ token, fromName: outcome.invite.from_name }}
      />
    </main>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test app/compatibility-test/invite/`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck**

Run: `bunx tsc --noEmit && echo "typecheck clean"`
Expected: `typecheck clean`

- [ ] **Step 6: Commit**

```bash
git add "app/compatibility-test/invite/[token]/page.tsx" "app/compatibility-test/invite/[token]/page.test.tsx"
git commit -m "feat: land a friend on the sender's questions"
```

---

### Task 9: The pair result page

**Files:**
- Create: `app/compatibility-test/pair/[id]/page.tsx`
- Test: `app/compatibility-test/pair/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `loadPair` (Task 2), `readShareParam` (Task 3), `PairResultView` (Task 7), `CompatibilityNotice` (Task 5), `content.compatibilityTest.pair` (Task 4).
- Produces: the route `/compatibility-test/pair/[id]`, the destination Task 6 navigates to.

**Why the metadata is static and says nothing about who:** a pair URL is a
capability, and a share preview unfurls wherever the link is pasted. A title
built from the result would broadcast both people's names into any chat that
touches the link — and would cost a second upstream fetch, because `weftFetch`
attaches an abort signal and so opts out of Next's request deduplication.
Neutral and free beats specific and leaky.

- [ ] **Step 1: Write the failing test**

Create `app/compatibility-test/pair/[id]/page.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Page, { metadata } from "./page";
import { content } from "@/content";

// Annotated rather than inferred: `Promise<{}>` only satisfies the page's
// parameter type by way of an implicit index signature, which is a fragile
// thing to depend on.
const NO_QUERY: Promise<Record<string, string | string[] | undefined>> =
  Promise.resolve({});

test("an unreachable backend explains itself instead of crashing", async () => {
  delete process.env.WEFT_API_URL;

  const html = renderToStaticMarkup(
    await Page({ params: Promise.resolve({ id: "p1" }), searchParams: NO_QUERY }),
  );

  expect(html).toContain(content.compatibilityTest.pair.unavailable.headline);
  expect(html).toContain("ctest-shell");
});

test("an empty id is a not-found without asking the backend", async () => {
  delete process.env.WEFT_API_URL;

  const html = renderToStaticMarkup(
    await Page({ params: Promise.resolve({ id: "" }), searchParams: NO_QUERY }),
  );

  expect(html).toContain(content.compatibilityTest.pair.missing.headline);
});

test("a result is never indexed", () => {
  // Both people's profiles sit behind this URL.
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("the preview names nobody", () => {
  // A share preview unfurls wherever the link is pasted, so neither field may
  // carry a name. Asserted exactly: a later edit that interpolates one should
  // fail here.
  expect(metadata.title).toBe("Weft: Your compatibility");
  expect(metadata.description).toBe(
    "How two people connect, in words rather than a score.",
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test app/compatibility-test/pair/`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Implement**

Create `app/compatibility-test/pair/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CompatibilityNotice } from "@/components/compatibility/CompatibilityNotice";
import { PairResultView } from "@/components/compatibility/PairResultView";
import { content } from "@/content";
import { readShareParam } from "@/lib/links";
import { loadPair } from "@/lib/server/pair";

export const metadata: Metadata = {
  title: "Weft: Your compatibility",
  description: "How two people connect, in words rather than a score.",
  // Both people's profiles sit behind this URL, and anyone holding it can read
  // them. It must never enter an index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PairPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const outcome = await loadPair(id);
  const copy = content.compatibilityTest.pair;

  if (outcome.status !== "ok") {
    const notice = outcome.status === "not_found" ? copy.missing : copy.unavailable;
    return (
      <main id="main-content">
        <CompatibilityNotice
          eyebrow={notice.eyebrow}
          headline={notice.headline}
          body={notice.body}
          cta={{ href: "/compatibility-test", label: copy.restart }}
        />
      </main>
    );
  }

  return (
    <main id="main-content">
      {/* Present only for the person who just finished: their own share token,
          carried here on the query string so the referral chain survives past
          depth one. Anyone arriving on a forwarded link sees no token, and is
          offered the quiz instead. */}
      <PairResultView result={outcome.result} shareToken={readShareParam(query.share)} />
    </main>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test app/compatibility-test/pair/`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `bun test 2>&1 | tail -4 && bunx tsc --noEmit && echo "typecheck clean"`
Expected: `4 fail` (the known four) and everything else passing, then `typecheck clean`.

- [ ] **Step 6: Commit**

```bash
git add "app/compatibility-test/pair/[id]/page.tsx" "app/compatibility-test/pair/[id]/page.test.tsx"
git commit -m "feat: serve the pair result both people land on"
```

---

### Task 10: A real two-person round trip, then stop

Every unit so far has been tested against a stub. This task runs the whole loop
against a live `weft_core` — the only way to find out whether the contract this
phase was written against is the contract the backend actually serves.

**Files:** none. This task changes no code; it either passes or sends you back
to a previous task.

- [ ] **Step 1: Start the backend**

In its own terminal:

```bash
cd /Users/shearytan/documents/surnx/weft_core && uvicorn weft.api:app --reload --port 8000
```

In-memory storage, no database, no proxy key — `_require_proxy_key` skips the
check when `WEFT_PROXY_KEY` is unset.

- [ ] **Step 2: Point the frontend at it and start `next dev`**

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend
[ -f .env.local ] || cp .env.example .env.local
grep WEFT_API_URL .env.local
```

Expected: `WEFT_API_URL=http://localhost:8000`

Then, in its own terminal: `bun run dev`

- [ ] **Step 3: Confirm the frontend is really talking to the backend**

```bash
curl -s -D - -o /dev/null http://localhost:3000/api/bank | grep -i x-weft-bank-source
```

Expected: `x-weft-bank-source: live` — **not** `fallback`. A `fallback` here
means the rest of this task would be testing nothing; fix the connection first.

- [ ] **Step 4: Answer as the originator**

`jq` may not be installed, so the JSON is read with `bun`, which is.

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend

# Every question answered: first option for a single, first two for a pick-2.
ANSWERS=$(bun -e '
const bank = require("./lib/compatibility-questions.json");
const out = {};
for (const q of bank.questions) out[q.id] = q.kind === "pick2" ? [0, 1] : 0;
console.log(JSON.stringify(out));
')

ANA=$(curl -s -c /tmp/weft-ana.jar -X POST http://localhost:3000/api/answers \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Ana\",\"email\":\"ana@example.com\",\"phone\":\"+14155550100\",\"answers\":$ANSWERS}")
echo "$ANA"
echo "$ANA" | grep -c session_id
grep weft_session /tmp/weft-ana.jar | grep -c HttpOnly
```

Expected: a body like `{"role":"originator","share_token":"…"}`, then `0` —
proving no `session_id` reached the client — then `1`, proving the cookie was
set httpOnly.

- [ ] **Step 5: Open the invite as the friend**

```bash
TOKEN=$(echo "$ANA" | bun -e 'const b = await Bun.stdin.json(); console.log(b.share_token)')
echo "$TOKEN"
curl -s "http://localhost:3000/compatibility-test/invite/$TOKEN" \
  | grep -o "Ana wants to know how you two connect."
```

Expected: the token echoed, then `Ana wants to know how you two connect.`

- [ ] **Step 6: Answer as the friend, in a different browser**

A separate cookie jar is the point — this is a second person, not Ana again.

```bash
BEN=$(curl -s -c /tmp/weft-ben.jar -X POST http://localhost:3000/api/answers \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Ben\",\"email\":\"ben@example.com\",\"phone\":\"+14155550111\",\"answers\":$ANSWERS,\"invite_token\":\"$TOKEN\"}")
echo "$BEN"
echo "$BEN" | grep -c session_id
```

Expected: `{"role":"responder","share_token":"…","pair_id":"…"}`, then `0`.

- [ ] **Step 7: Read the result both of them get**

```bash
PAIR=$(echo "$BEN" | bun -e 'const b = await Bun.stdin.json(); console.log(b.pair_id)')
BEN_TOKEN=$(echo "$BEN" | bun -e 'const b = await Bun.stdin.json(); console.log(b.share_token)')

curl -s "http://localhost:3000/compatibility-test/pair/$PAIR?share=$BEN_TOKEN" > /tmp/weft-pair.html
grep -c "Ana" /tmp/weft-pair.html
grep -c "Ben" /tmp/weft-pair.html
grep -o "compatibility-test/invite/$BEN_TOKEN" /tmp/weft-pair.html | head -1
```

Expected: both names present at least once, and the responder's own invite path
rendered — the referral chain survives past depth one.

- [ ] **Step 8: Check the result without a share token**

```bash
curl -s "http://localhost:3000/compatibility-test/pair/$PAIR" \
  | grep -c "compatibility-test/invite/"
```

Expected: `0` — someone arriving on a forwarded pair link is offered the quiz,
not a stranger's invite link.

- [ ] **Step 9: Check the dead ends**

```bash
curl -s http://localhost:3000/compatibility-test/invite/not-a-real-token | grep -o "We can&#x27;t find that invitation."
curl -s http://localhost:3000/compatibility-test/pair/not-a-real-pair | grep -o "We can&#x27;t find that result."
```

Expected: one match each.

- [ ] **Step 10: Walk it once in a browser**

Open `http://localhost:3000/compatibility-test/invite/$TOKEN` and check by eye:

  1. The intro names Ana.
  2. Twenty questions render; single-choice auto-advances, pick-two needs both
     and shows "Pick exactly two".
  3. **Back** out of the details form and the last question is still answered.
  4. Submitting shows the loader and lands on the pair result.
  5. Both people are named. No score, no percentage, no raw answers appear.
  6. **Copy link** works and the confirmation clears after ~2s.

- [ ] **Step 11: Full suite, typecheck, lint**

```bash
bun test 2>&1 | tail -4
bunx tsc --noEmit && echo "typecheck clean"
bun run lint
```

Expected: `4 fail` and no others; `typecheck clean`; lint clean.

- [ ] **Step 12: Confirm no secret reached the client bundle**

```bash
grep -rn "WEFT_API_URL\|WEFT_PROXY_KEY" --include="*.ts" --include="*.tsx" . --exclude-dir=node_modules --exclude-dir=docs --exclude-dir=.next
```

Expected: matches only in `lib/server/weftApi.ts`, `lib/server/bank.test.ts`,
`lib/server/invite.test.ts`, `lib/server/pair.test.ts`,
`lib/server/submitAnswers.test.ts` and the two page tests — never in a file
carrying `"use client"`.

- [ ] **Step 13: Commit anything outstanding, then stop**

```bash
git status --short
git log --oneline -9
```

Expected: a clean tree and the nine commits of this phase.

**EXIT GATE — this phase ends here.** Report:

1. The two-person round trip, with the actual `share_token` → `pair_id` chain observed.
2. `bun test` counts, before and after.
3. That the three dead-end screens were seen.
4. **The deviation from the spec's route map** (no `/api/invite/[token]`,
   `/api/pair/[id]` or `POST /api/invite` Route Handlers) and the reason — this
   needs an explicit decision, not silent acceptance.
5. The `?share=<token>` trade-off: a forwarded pair URL also forwards the
   responder's invite capability.
6. Anything in the spec's Phase 4 that this phase's shape now affects.

Do **not** begin Phase 4 until that report is explicitly approved.

---

## Notes for the reviewer

**What this phase deliberately does not do:**

- **No "you" anywhere in the result.** The payload cannot identify its reader,
  so both people are named. Phase 4's matches page reads the session cookie and
  *could* identify the viewer; if that is wanted here too, it is a Phase 4
  change, not a Phase 3 one.
- **No guard against answering your own invite.** The backend has none
  (verified), so a person opening their own link creates a second session and a
  pair with themselves. Adding a frontend-only guard would be theatre — the
  cookie identifies the browser, not the person, and the backend would still
  accept a direct POST. If this matters, it belongs in `weft_core`.
- **Invite tokens are not single-use.** One link can be answered by many people,
  producing many pairs. That is the backend's behaviour and the referral model
  depends on it.
- **No email to the originator** when their friend finishes. Out of scope per the
  spec; the originator finds out via Phase 4's matches page.
