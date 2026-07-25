# Weft Integration — Phase 2: Bank, Details Step, Originator Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one person take the real 20-question quiz served by `weft_core`, hand over their details, and walk away with a working share link — and nothing else.

**Architecture:** The server page loads the question bank through `lib/server/bank.ts` (live upstream, static JSON snapshot when the backend is down) and passes rendered questions to the client component as a prop. The client state machine gains a `"details"` phase between the last question and a terminal `"share"` screen; submitting POSTs to the same-origin `/api/answers` Route Handler, which forwards to `weft_core`, stores the returned `session_id` in the httpOnly cookie, and returns only the share token. The solo archetype "result" screen is deleted — a profile is never shown alone.

**Tech Stack:** Next.js 16.2.11 (App Router), React 19.2.4, TypeScript strict, Tailwind v4, `bun test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-25-weft-backend-frontend-integration-design.md`
**Preceded by:** Phase 0 (`weft_core` branch `feat/bff-contract`, complete) and Phase 1 (this repo, branch `feat/bff-foundation`, complete).

## Global Constraints

- **Repo:** `/Users/shearytan/Documents/SurnX/web-frontend`, continuing on the existing branch `feat/bff-foundation`. Never commit to `main`.
- **No new dependencies.** Built-in `fetch`, `AbortSignal.timeout`, `next/headers`, React, Tailwind classes already in the codebase.
- **Server-only secrets.** `WEFT_API_URL` / `WEFT_PROXY_KEY` are read *only* inside `lib/server/weftApi.ts`. Never `NEXT_PUBLIC_`, never imported by a client component.
- **The `session_id` never reaches the browser.** It goes into the `weft_session` cookie in the Route Handler and is stripped from every JSON body sent to the client. Only the disposable `share_token` is returned.
- **Next.js 16 facts this plan depends on** (verified in `node_modules/next/dist/docs/`):
  - `cookies()` is async; a cookie can only be **set** in a Route Handler or Server Function, never during Server Component render.
  - Route Handlers are **not cached** by default and are **public HTTP endpoints** — never leak upstream URLs, secrets, or raw upstream error bodies.
  - Passing an `AbortController`/`AbortSignal` to `fetch` **opts that request out of Next's Data Cache** (`03-api-reference/04-functions/fetch.md:88`). `weftFetch` always passes a timeout signal, so `next: { revalidate }` would be silently ignored — this is why Task 2 memoises the bank itself.
- **Verified backend contract** (`weft_core@feat/bff-contract`, `weft/trivia_engine.py:272` `public_bank`):
  `GET /api/bank` → `{ "questions": [{ "id": "Q1", "kind": "single" | "pick2", "seg": 1..5, "prompt": "...", "options": ["text", ...] }], "question_set": ["Q1", ...] }` — **20 questions**, options are **plain strings with no ids**.
  `POST /api/answers` → `{ role, session_id, share_token }` (+ `pair_id` for a responder).
- **Tests colocate** as `<name>.test.ts(x)` beside the file, and run with `bun test`.
- **Pre-existing red tests:** 4 tests fail on `main` (`components/sections/Turn.test.tsx`, `Nav.test.tsx`, `Faq.test.tsx`, `Hero.test.tsx` — unrelated media/copy assertions). Do not fix them here; just do not add to them.
- **Exit gate:** this phase ends at Task 8. Stop, report, and wait for explicit approval before starting Phase 3.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/weftTypes.ts` *(modify)* | Correct `BankQuestion` to the real wire shape (string options, `pick2`, `seg`) |
| `lib/compatibility-questions.json` *(create)* | Frozen snapshot of the live bank — the offline fallback |
| `lib/compatibilityQuestions.ts` *(create)* | The `QuizQuestion` UI type, `toQuizQuestions()` (mints `Q1-0` option ids), `FALLBACK_BANK` |
| `lib/compatibilityQuestions.test.ts` *(create)* | Mapping + fallback-integrity tests |
| `lib/server/bank.ts` *(create)* | `loadBank()` — live upstream with static fallback and a 1-hour memo |
| `lib/server/bank.test.ts` *(create)* | Fallback, memo, and shape-guard tests |
| `app/api/bank/route.ts` *(create)* | `GET /api/bank` proxy |
| `lib/details.ts` *(create)* | Pure name/email/phone validation |
| `lib/details.test.ts` *(create)* | Validation tests |
| `lib/compatibility.ts` *(modify)* | `Phase` gains `details`/`submitting`/`share`; pick-2 cap; progress as a fraction |
| `lib/compatibility.test.ts` *(modify)* | Updated state-machine tests |
| `lib/server/submitAnswers.ts` *(create)* | Testable core of the answers proxy: body guard, upstream call, status mapping |
| `lib/server/submitAnswers.test.ts` *(create)* | Body-guard, cookie-value, and error-mapping tests |
| `app/api/answers/route.ts` *(create)* | `POST /api/answers` — calls the core, sets the cookie |
| `content.ts` *(modify)* | Drop the mock `questions`/`result`; add `details` + `share` copy; fix "Three quick questions" |
| `content.test.ts` *(modify)* | Assertions for the new copy blocks |
| `app/globals.css` *(modify)* | Progress bar (replaces 20 impossible dots), form field, error, share-link styles |
| `components/compatibility/DetailsForm.tsx` *(create)* | The details step |
| `components/compatibility/ShareScreen.tsx` *(create)* | The terminal share-link screen |
| `components/compatibility/CompatibilityTest.tsx` *(modify)* | Takes `questions` as a prop; wires details → submit → share |
| `components/compatibility/CompatibilityTest.test.tsx` *(modify)* | Updated for the prop and removed result screen |
| `app/compatibility-test/page.tsx` *(modify)* | Async server page; loads the bank |
| `app/compatibility-test/page.test.tsx` *(modify)* | Awaits the async page |

---

### Task 1: The real bank shape and the offline fallback

Phase 1 left `lib/answers.ts` importing `@/lib/compatibilityQuestions`, a module that does not exist — `bunx tsc --noEmit` reports `TS2307` for it today. This task creates it, and corrects `BankQuestion`, which Phase 1 guessed wrong (it declared object options and a `"multi"` kind; the backend sends plain strings and `"pick2"`).

**Files:**
- Modify: `lib/weftTypes.ts:108-118` (the `BankOption` / `BankQuestion` block)
- Create: `lib/compatibility-questions.json`
- Create: `lib/compatibilityQuestions.ts`
- Test: `lib/compatibilityQuestions.test.ts`

**Interfaces:**
- Consumes: `BankQuestion`, `BankResponse` from `lib/weftTypes.ts`.
- Produces:
  - `type QuizOption = { id: string; label: string }`
  - `type QuizQuestion = { id: string; prompt: string; kind: "single" | "multi"; select?: number; options: QuizOption[] }` — the shape `lib/answers.ts` already expects.
  - `toQuizQuestions(questions: readonly BankQuestion[]): QuizQuestion[]`
  - `FALLBACK_BANK: BankResponse`
  - `isBankResponse(value: unknown): value is BankResponse`

**Why option ids are minted here:** the backend identifies an option purely by its position, and `optionIndex()` (Phase 1) reads that position back off the `"<qid>-<n>"` suffix. Minting the id at exactly one place is what keeps the round-trip honest.

- [ ] **Step 1: Snapshot the live bank into the repo**

```bash
cd /Users/shearytan/documents/surnx/weft_core && python3 -c "
import json, sys
sys.path.insert(0, '.')
from weft.trivia_engine import public_bank
from weft.api import QUIZ_SET
print(json.dumps({'questions': public_bank(QUIZ_SET), 'question_set': list(QUIZ_SET)}, indent=2, ensure_ascii=False))
" > /Users/shearytan/Documents/SurnX/web-frontend/lib/compatibility-questions.json
```

Verify:

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend && bun -e "const b=require('./lib/compatibility-questions.json');console.log(b.questions.length, b.question_set.length, [...new Set(b.questions.map(q=>q.kind))].sort().join(','))"
```

Expected: `20 20 pick2,single`

- [ ] **Step 2: Correct `BankQuestion` in `lib/weftTypes.ts`**

Replace the `BankOption` and `BankQuestion` declarations with:

```ts
/**
 * Exactly what `public_bank()` sends: options are plain strings in a fixed
 * order, and that order is the wire identity of an answer. `seg` is the
 * segment the question loads onto -- carried through untouched.
 */
export type BankQuestion = {
  id: string;
  prompt: string;
  kind: "single" | "pick2";
  seg: number;
  options: string[];
};
```

Delete the now-unused `BankOption` type.

- [ ] **Step 3: Write the failing tests**

Create `lib/compatibilityQuestions.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  FALLBACK_BANK,
  isBankResponse,
  toQuizQuestions,
} from "./compatibilityQuestions";
import { toBackendAnswers } from "./answers";
import type { BankQuestion } from "./weftTypes";

const BANK: BankQuestion[] = [
  { id: "Q1", prompt: "One of these", kind: "single", seg: 1, options: ["a", "b", "c"] },
  { id: "W2", prompt: "Two of these", kind: "pick2", seg: 3, options: ["w", "x", "y", "z"] },
];

describe("toQuizQuestions", () => {
  test("a single question keeps its prompt and needs one choice", () => {
    const [q] = toQuizQuestions(BANK);
    expect(q.id).toBe("Q1");
    expect(q.prompt).toBe("One of these");
    expect(q.kind).toBe("single");
    expect(q.select).toBeUndefined();
  });

  test("a pick2 question becomes a multi that takes exactly two", () => {
    const q = toQuizQuestions(BANK)[1];
    expect(q.kind).toBe("multi");
    expect(q.select).toBe(2);
  });

  test("options gain positional ids the backend can read back", () => {
    const [q] = toQuizQuestions(BANK);
    expect(q.options).toEqual([
      { id: "Q1-0", label: "a" },
      { id: "Q1-1", label: "b" },
      { id: "Q1-2", label: "c" },
    ]);
  });

  test("a selection round-trips back to the index the backend expects", () => {
    const questions = toQuizQuestions(BANK);
    const picked = { Q1: [questions[0].options[2].id], W2: [questions[1].options[0].id, questions[1].options[3].id] };
    expect(toBackendAnswers(picked, questions)).toEqual({ Q1: 2, W2: [0, 3] });
  });
});

describe("isBankResponse", () => {
  test("accepts the real payload", () => {
    expect(isBankResponse(FALLBACK_BANK)).toBe(true);
  });

  test("rejects anything that would not render", () => {
    expect(isBankResponse(null)).toBe(false);
    expect(isBankResponse({ questions: [] })).toBe(false);
    expect(isBankResponse({ questions: [{ id: "Q1" }], question_set: ["Q1"] })).toBe(false);
  });
});

describe("the bundled fallback", () => {
  test("carries the whole served quiz", () => {
    expect(FALLBACK_BANK.questions).toHaveLength(20);
    expect(FALLBACK_BANK.question_set).toHaveLength(20);
  });

  test("every question is renderable and uniquely identified", () => {
    const ids = new Set<string>();
    for (const q of FALLBACK_BANK.questions) {
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.options.length).toBeGreaterThan(1);
      expect(q.options.every((o) => o.length > 0)).toBe(true);
      ids.add(q.id);
    }
    expect(ids.size).toBe(20);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `bun test lib/compatibilityQuestions.test.ts`
Expected: FAIL — cannot resolve `./compatibilityQuestions`.

- [ ] **Step 5: Implement**

Create `lib/compatibilityQuestions.ts`:

```ts
import type { BankQuestion, BankResponse } from "@/lib/weftTypes";
import fallback from "./compatibility-questions.json";

/**
 * The UI's view of a question. The backend sends bare option strings; the quiz
 * needs a stable key per button, and the answer adapter needs to recover the
 * option's position. Minting `<qid>-<index>` here satisfies both, and doing it
 * in one place is what keeps the round-trip honest.
 */
export type QuizOption = { id: string; label: string };

export type QuizQuestion = {
  id: string;
  prompt: string;
  kind: "single" | "multi";
  /** Multi questions only: exactly this many choices. */
  select?: number;
  options: QuizOption[];
};

export function toQuizQuestions(
  questions: readonly BankQuestion[],
): QuizQuestion[] {
  // The callback is annotated so `kind` narrows to the union instead of widening
  // to `string` on the way through `.map`.
  return questions.map((q): QuizQuestion => ({
    id: q.id,
    prompt: q.prompt,
    kind: q.kind === "pick2" ? "multi" : "single",
    // "pick2" means exactly two -- not "two or more".
    ...(q.kind === "pick2" ? { select: 2 } : {}),
    options: q.options.map((label, index) => ({ id: `${q.id}-${index}`, label })),
  }));
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
  return questions.every(
    (q) =>
      typeof q?.id === "string" &&
      typeof q?.prompt === "string" &&
      (q?.kind === "single" || q?.kind === "pick2") &&
      Array.isArray(q?.options) &&
      q.options.length > 1 &&
      q.options.every((o: unknown) => typeof o === "string"),
  );
}

/**
 * A snapshot of the served bank, generated from weft_core's `public_bank()`.
 * It exists so the quiz still renders when the backend is unreachable --
 * answering still needs the backend, but nobody meets an empty page.
 */
export const FALLBACK_BANK: BankResponse = fallback as BankResponse;
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test lib/compatibilityQuestions.test.ts lib/answers.test.ts`
Expected: PASS (10 + 12 tests)

- [ ] **Step 7: Confirm the Phase 1 dangling import is gone**

Run: `bunx tsc --noEmit 2>&1 | grep -E "lib/(answers|weftTypes|compatibilityQuestions)\.ts" || echo "phase 1+2 lib files typecheck clean"`
Expected: `phase 1+2 lib files typecheck clean`

- [ ] **Step 8: Commit**

```bash
git add lib/weftTypes.ts lib/compatibility-questions.json lib/compatibilityQuestions.ts lib/compatibilityQuestions.test.ts
git commit -m "feat: map the live question bank to the quiz UI shape"
```

---

### Task 2: Loading the bank, live or offline

**Files:**
- Create: `lib/server/bank.ts`
- Test: `lib/server/bank.test.ts`
- Create: `app/api/bank/route.ts`

**Interfaces:**
- Consumes: `weftFetch` (Phase 1), `FALLBACK_BANK` / `isBankResponse` (Task 1).
- Produces:
  - `type BankSource = "live" | "fallback"`
  - `type LoadedBank = { bank: BankResponse; source: BankSource }`
  - `loadBank(deps?: { fetchImpl?: typeof fetch; now?: () => number }): Promise<LoadedBank>`
  - `resetBankCache(): void` — test seam.

**Why a hand-rolled memo:** `weftFetch` always attaches `AbortSignal.timeout`, and a signal opts a request out of Next's Data Cache, so `next: { revalidate: 3600 }` would do nothing. A module-level TTL memo gets the same effect, works in any runtime, and is directly testable. Only *successful* loads are memoised — an outage must not be cached for an hour.

- [ ] **Step 1: Write the failing tests**

Create `lib/server/bank.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { loadBank, resetBankCache } from "./bank";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const LIVE = {
  questions: [
    { id: "Q1", prompt: "live prompt", kind: "single", seg: 1, options: ["a", "b"] },
  ],
  question_set: ["Q1"],
};

beforeEach(() => {
  resetBankCache();
  process.env.WEFT_API_URL = "https://api.example.test";
});

describe("loadBank", () => {
  test("returns the upstream bank when the backend answers", async () => {
    const res = await loadBank({ fetchImpl: async () => ok(LIVE) });
    expect(res.source).toBe("live");
    expect(res.bank.questions[0].prompt).toBe("live prompt");
  });

  test("falls back to the bundled snapshot when the backend is down", async () => {
    const res = await loadBank({
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    expect(res.source).toBe("fallback");
    expect(res.bank.questions).toHaveLength(20);
  });

  test("falls back when the backend answers 200 with nonsense", async () => {
    const res = await loadBank({ fetchImpl: async () => ok({ questions: "soon" }) });
    expect(res.source).toBe("fallback");
    expect(res.bank.questions).toHaveLength(20);
  });

  test("serves a second caller from memory inside the hour", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return ok(LIVE);
    };
    await loadBank({ fetchImpl, now: () => 0 });
    const res = await loadBank({ fetchImpl, now: () => 60 * 60 * 1000 - 1 });
    expect(calls).toBe(1);
    expect(res.source).toBe("live");
  });

  test("refetches once the hour is up", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return ok(LIVE);
    };
    await loadBank({ fetchImpl, now: () => 0 });
    await loadBank({ fetchImpl, now: () => 60 * 60 * 1000 });
    expect(calls).toBe(2);
  });

  test("never caches an outage", async () => {
    let calls = 0;
    const failing = async () => {
      calls += 1;
      throw new Error("down");
    };
    await loadBank({ fetchImpl: failing, now: () => 0 });
    await loadBank({ fetchImpl: failing, now: () => 1 });
    expect(calls).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/server/bank.test.ts`
Expected: FAIL — cannot resolve `./bank`.

- [ ] **Step 3: Implement**

Create `lib/server/bank.ts`:

```ts
import { FALLBACK_BANK, isBankResponse } from "@/lib/compatibilityQuestions";
import { weftFetch } from "@/lib/server/weftApi";
import type { BankResponse } from "@/lib/weftTypes";

export type BankSource = "live" | "fallback";
export type LoadedBank = { bank: BankResponse; source: BankSource };

/** The bank changes when someone edits weft_core, which is not often. */
const TTL_MS = 60 * 60 * 1000;

let memo: { at: number; bank: BankResponse } | null = null;

/** Test seam: module state would otherwise leak between test cases. */
export function resetBankCache(): void {
  memo = null;
}

/**
 * The questions, from the backend when it is reachable and from the bundled
 * snapshot when it is not. Answering still needs the backend -- this only
 * guarantees nobody ever meets an empty quiz.
 *
 * Memoised here rather than through `next: { revalidate }` because weftFetch
 * attaches an abort signal, and a signal opts a fetch out of Next's Data Cache.
 */
export async function loadBank(deps?: {
  fetchImpl?: typeof fetch;
  now?: () => number;
}): Promise<LoadedBank> {
  const now = deps?.now ?? Date.now;
  const at = now();
  if (memo && at - memo.at < TTL_MS) return { bank: memo.bank, source: "live" };

  const result = await weftFetch<unknown>(
    "/api/bank",
    { method: "GET" },
    deps?.fetchImpl,
  );

  if (!result.ok || !isBankResponse(result.data)) {
    if (result.ok) console.error("weft_core returned an unrenderable bank");
    // Deliberately not memoised: an outage must not be cached for an hour.
    return { bank: FALLBACK_BANK, source: "fallback" };
  }

  memo = { at, bank: result.data };
  return { bank: result.data, source: "live" };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test lib/server/bank.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Add the route handler**

Create `app/api/bank/route.ts`:

```ts
import { loadBank } from "@/lib/server/bank";

/**
 * The questions, same-origin. Deliberately uncached at the route level: the
 * hour-long memo lives in loadBank, so a cached route would only add a second,
 * staler layer -- and would freeze a fallback response in place if the backend
 * happened to be down when it was filled.
 */
export async function GET() {
  const { bank, source } = await loadBank();
  return Response.json(bank, { headers: { "x-weft-bank-source": source } });
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/server/bank.ts lib/server/bank.test.ts app/api/bank/route.ts
git commit -m "feat: serve the question bank with an offline fallback"
```

---

### Task 3: Details validation

The backend rejects a blank `name`, `email`, or `phone` with a 400 (`weft/api.py:124`). Catching that in the browser turns a round-trip into an inline message.

**Files:**
- Create: `lib/details.ts`
- Test: `lib/details.test.ts`

**Interfaces:**
- Produces:
  - `type Details = { name: string; email: string; phone: string }`
  - `type DetailsErrors = Partial<Record<keyof Details, string>>`
  - `trimDetails(details: Details): Details`
  - `validateDetails(details: Details): DetailsErrors`
  - `hasErrors(errors: DetailsErrors): boolean`

- [ ] **Step 1: Write the failing tests**

Create `lib/details.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { hasErrors, trimDetails, validateDetails } from "./details";

const VALID = { name: "Ada", email: "ada@example.com", phone: "+1 415 555 0100" };

describe("validateDetails", () => {
  test("accepts a complete set", () => {
    expect(validateDetails(VALID)).toEqual({});
  });

  test("requires a name that is not just spaces", () => {
    expect(validateDetails({ ...VALID, name: "   " }).name).toBeTruthy();
  });

  test("requires an email that could exist", () => {
    expect(validateDetails({ ...VALID, email: "" }).email).toBeTruthy();
    expect(validateDetails({ ...VALID, email: "ada" }).email).toBeTruthy();
    expect(validateDetails({ ...VALID, email: "ada@example" }).email).toBeTruthy();
    expect(validateDetails({ ...VALID, email: "a b@example.com" }).email).toBeTruthy();
  });

  test("requires enough digits to be a phone number", () => {
    expect(validateDetails({ ...VALID, phone: "" }).phone).toBeTruthy();
    expect(validateDetails({ ...VALID, phone: "12345" }).phone).toBeTruthy();
  });

  test("accepts phone numbers however they are punctuated", () => {
    // Nobody agrees on formatting, so only the digits are counted.
    for (const phone of ["+44 7700 900123", "(415) 555-0100", "0415.555.0100"]) {
      expect(validateDetails({ ...VALID, phone }).phone).toBeUndefined();
    }
  });

  test("reports every bad field at once", () => {
    const errors = validateDetails({ name: "", email: "", phone: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "phone"]);
  });
});

describe("trimDetails", () => {
  test("strips the whitespace the backend would reject", () => {
    expect(trimDetails({ name: " Ada ", email: " ada@example.com ", phone: " 415 555 0100 " })).toEqual({
      name: "Ada",
      email: "ada@example.com",
      phone: "415 555 0100",
    });
  });
});

describe("hasErrors", () => {
  test("is false only for an empty set", () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ name: "Your name is required" })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/details.test.ts`
Expected: FAIL — cannot resolve `./details`.

- [ ] **Step 3: Implement**

Create `lib/details.ts`:

```ts
/**
 * The three things weft_core requires before it will accept a submission.
 * Validated here so a missing field is an inline message rather than a
 * round-trip and a 400.
 */
export type Details = { name: string; email: string; phone: string };

export type DetailsErrors = Partial<Record<keyof Details, string>>;

/** Deliberately loose: enough shape to catch a typo, not a spec of RFC 5322. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The shortest real national numbers are 7 digits. */
const MIN_PHONE_DIGITS = 7;

export function trimDetails(details: Details): Details {
  return {
    name: details.name.trim(),
    email: details.email.trim(),
    phone: details.phone.trim(),
  };
}

export function validateDetails(details: Details): DetailsErrors {
  const { name, email, phone } = trimDetails(details);
  const errors: DetailsErrors = {};

  if (name === "") errors.name = "Your name is required.";
  if (!EMAIL.test(email)) errors.email = "Enter an email address we can reach you at.";
  // Formatting varies by country, so only the digits are counted.
  if (phone.replace(/\D/g, "").length < MIN_PHONE_DIGITS) {
    errors.phone = "Enter a phone number, including the country code.";
  }

  return errors;
}

export function hasErrors(errors: DetailsErrors): boolean {
  return Object.keys(errors).length > 0;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test lib/details.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/details.ts lib/details.test.ts
git commit -m "feat: validate the details the backend requires"
```

---

### Task 4: The state machine grows a details step

**Files:**
- Modify: `lib/compatibility.ts` (whole file)
- Modify: `lib/compatibility.test.ts` (whole file)

**Interfaces:**
- Produces (changed signatures — Task 8 depends on these exact names):
  - `type Phase = "intro" | "quiz" | "details" | "submitting" | "share"` — `"analyzing"` and `"result"` are gone.
  - `toggleOption(answers, questionId, optionId, kind, limit?: number): Answers`
  - `canAdvance(answers, questionId, requiredCount = 1): boolean`
  - `nextQuizState(activeIndex, questionCount)` — the last question now leads to `"details"`.
  - `backFromDetails(questionCount): { phase: Phase; activeIndex: number }`
  - `progressFraction(activeIndex, questionCount): number` — replaces `progressDots`.
- Unchanged: `getSelected`, `isSelected`, `prevQuizState`, `ANALYZING_MS`.

**Why `progressDots` goes:** `.ctest-dot` is `2.2rem` wide (`app/globals.css:873`). Twenty of them plus gaps is over 50rem — it cannot fit any screen. A single fill bar carries the same information at any question count.

**Why a pick-2 cap:** `"pick2"` means exactly two, and `validate_answers` rejects anything else (`weft/trivia_engine.py:299`). A third tap pushes out the oldest choice, so the thing just tapped is always selected.

- [ ] **Step 1: Rewrite the tests**

Replace the whole contents of `lib/compatibility.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  ANALYZING_MS,
  backFromDetails,
  canAdvance,
  getSelected,
  isSelected,
  nextQuizState,
  prevQuizState,
  progressFraction,
  toggleOption,
} from "./compatibility";

describe("toggleOption", () => {
  test("single select replaces the prior choice", () => {
    const a = toggleOption({}, "q1", "a", "single");
    expect(getSelected(a, "q1")).toEqual(["a"]);
    const b = toggleOption(a, "q1", "b", "single");
    expect(getSelected(b, "q1")).toEqual(["b"]);
  });

  test("single select toggling the same option clears it", () => {
    const a = toggleOption({}, "q1", "a", "single");
    const b = toggleOption(a, "q1", "a", "single");
    expect(getSelected(b, "q1")).toEqual([]);
  });

  test("multi select accumulates and toggles off", () => {
    let a = toggleOption({}, "q2", "x", "multi");
    a = toggleOption(a, "q2", "y", "multi");
    expect(getSelected(a, "q2").sort()).toEqual(["x", "y"]);
    a = toggleOption(a, "q2", "x", "multi");
    expect(getSelected(a, "q2")).toEqual(["y"]);
  });

  test("a limited multi drops the oldest choice rather than refusing a new one", () => {
    // pick2 means exactly two, and the tap that just happened should always win.
    let a = toggleOption({}, "q2", "x", "multi", 2);
    a = toggleOption(a, "q2", "y", "multi", 2);
    a = toggleOption(a, "q2", "z", "multi", 2);
    expect(getSelected(a, "q2")).toEqual(["y", "z"]);
  });

  test("does not mutate the input object", () => {
    const input = {};
    toggleOption(input, "q1", "a", "single");
    expect(input).toEqual({});
  });
});

describe("canAdvance / isSelected", () => {
  test("requires exactly one selection by default", () => {
    expect(canAdvance({}, "q1")).toBe(false);
    expect(canAdvance({ q1: ["a"] }, "q1")).toBe(true);
  });

  test("a pick-two is not answered until both are chosen", () => {
    expect(canAdvance({ q2: ["x"] }, "q2", 2)).toBe(false);
    expect(canAdvance({ q2: ["x", "y"] }, "q2", 2)).toBe(true);
  });

  test("isSelected reflects membership", () => {
    expect(isSelected({ q1: ["a"] }, "q1", "a")).toBe(true);
    expect(isSelected({ q1: ["a"] }, "q1", "b")).toBe(false);
  });
});

describe("quiz navigation", () => {
  test("advancing a middle question moves to the next index", () => {
    expect(nextQuizState(0, 3)).toEqual({ phase: "quiz", activeIndex: 1 });
  });

  test("advancing the last question asks for details", () => {
    expect(nextQuizState(2, 3)).toEqual({ phase: "details", activeIndex: 2 });
  });

  test("going back from a middle question decrements", () => {
    expect(prevQuizState(2)).toEqual({ phase: "quiz", activeIndex: 1 });
  });

  test("going back from the first question returns to intro", () => {
    expect(prevQuizState(0)).toEqual({ phase: "intro", activeIndex: 0 });
  });

  test("backing out of details returns to the last question", () => {
    // Answers live in component state, so nothing is lost on the way back.
    expect(backFromDetails(20)).toEqual({ phase: "quiz", activeIndex: 19 });
  });

  test("backing out of details on an empty quiz cannot go negative", () => {
    expect(backFromDetails(0)).toEqual({ phase: "quiz", activeIndex: 0 });
  });
});

describe("progressFraction", () => {
  test("counts the current question as done", () => {
    expect(progressFraction(0, 4)).toBe(0.25);
    expect(progressFraction(3, 4)).toBe(1);
  });

  test("stays inside 0..1 whatever it is handed", () => {
    expect(progressFraction(9, 4)).toBe(1);
    expect(progressFraction(0, 0)).toBe(0);
  });
});

test("analyzing duration is a positive constant", () => {
  expect(ANALYZING_MS).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/compatibility.test.ts`
Expected: FAIL — `backFromDetails` / `progressFraction` are not exported.

- [ ] **Step 3: Implement**

In `lib/compatibility.ts`, replace the `Phase` type, `toggleOption`, `canAdvance`, `nextQuizState`, and `progressDots`:

```ts
/**
 * The originator's journey. A solo profile is never shown, so the quiz ends at
 * a share link -- there is no "result" phase for one person.
 */
export type Phase = "intro" | "quiz" | "details" | "submitting" | "share";
```

```ts
export function toggleOption(
  answers: Answers,
  questionId: string,
  optionId: string,
  kind: SelectKind,
  limit?: number,
): Answers {
  const current = getSelected(answers, questionId);
  let next: string[];
  if (kind === "single") {
    next = current.includes(optionId) ? [] : [optionId];
  } else if (current.includes(optionId)) {
    next = current.filter((id) => id !== optionId);
  } else {
    next = [...current, optionId];
    // A pick-2 takes exactly two: a third choice pushes out the oldest, so the
    // option just tapped is always the one selected.
    if (limit !== undefined && next.length > limit) next = next.slice(next.length - limit);
  }
  return { ...answers, [questionId]: next };
}

export function canAdvance(
  answers: Answers,
  questionId: string,
  requiredCount = 1,
): boolean {
  return getSelected(answers, questionId).length === requiredCount;
}

export function nextQuizState(
  activeIndex: number,
  questionCount: number,
): { phase: Phase; activeIndex: number } {
  if (activeIndex >= questionCount - 1) {
    return { phase: "details", activeIndex };
  }
  return { phase: "quiz", activeIndex: activeIndex + 1 };
}
```

Then delete `progressDots` and add, after `prevQuizState`:

```ts
/** Back out of the details form and the last question is waiting, still answered. */
export function backFromDetails(
  questionCount: number,
): { phase: Phase; activeIndex: number } {
  return { phase: "quiz", activeIndex: Math.max(0, questionCount - 1) };
}

/**
 * How far along the quiz is, 0..1. A dot per question was fine for three and
 * impossible for twenty; one bar reads the same at any length.
 */
export function progressFraction(
  activeIndex: number,
  questionCount: number,
): number {
  if (questionCount <= 0) return 0;
  return Math.min(1, Math.max(0, (activeIndex + 1) / questionCount));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test lib/compatibility.test.ts`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/compatibility.ts lib/compatibility.test.ts
git commit -m "feat: route the quiz into a details step instead of a solo result"
```

---

### Task 5: The answers proxy

**Files:**
- Create: `lib/server/submitAnswers.ts`
- Test: `lib/server/submitAnswers.test.ts`
- Create: `app/api/answers/route.ts`

**Interfaces:**
- Consumes: `weftFetch` / `WeftErrorCode` (Phase 1), `setSessionCookie` (Phase 1), `AnswersRequest` / `AnswersResponse` (Phase 1).
- Produces:
  - `type ClientAnswers = { role: "originator" | "responder"; share_token: string; pair_id?: string }`
  - `type SubmitOutcome = { ok: true; sessionId: string; body: ClientAnswers } | { ok: false; status: number; body: { error: string; code: WeftErrorCode } }`
  - `parseAnswersBody(raw: unknown): AnswersRequest | null`
  - `submitAnswers(raw: unknown, fetchImpl?: typeof fetch): Promise<SubmitOutcome>`

**Why the logic lives outside `route.ts`:** the handler's only untestable part is `cookies()`. Keeping everything else in a plain function means the proxy's real behaviour — body guard, status mapping, and the fact that `session_id` never reaches the client — is covered by ordinary unit tests.

**Status mapping:** `validation` → 400, `not_found` → 404, `expired` → 410, `unauthorized` → 502 (a rejected proxy key is our misconfiguration, not the visitor's fault), `unavailable` → 503.

- [ ] **Step 1: Write the failing tests**

Create `lib/server/submitAnswers.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { parseAnswersBody, submitAnswers } from "./submitAnswers";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  name: "Ada",
  email: "ada@example.com",
  phone: "+1 415 555 0100",
  answers: { Q1: 2, W2: [0, 3] },
};

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
});

describe("parseAnswersBody", () => {
  test("accepts a complete originator submission", () => {
    expect(parseAnswersBody(VALID)).toEqual(VALID);
  });

  test("accepts an invite token when one is present", () => {
    const withToken = { ...VALID, invite_token: "abc" };
    expect(parseAnswersBody(withToken)?.invite_token).toBe("abc");
  });

  test("rejects anything that is not a submission", () => {
    expect(parseAnswersBody(null)).toBeNull();
    expect(parseAnswersBody("hello")).toBeNull();
    expect(parseAnswersBody({ ...VALID, name: 42 })).toBeNull();
    expect(parseAnswersBody({ ...VALID, answers: [] })).toBeNull();
    expect(parseAnswersBody({ ...VALID, answers: {} })).toBeNull();
    expect(parseAnswersBody({ ...VALID, answers: { Q1: "two" } })).toBeNull();
    expect(parseAnswersBody({ ...VALID, invite_token: 7 })).toBeNull();
  });
});

describe("submitAnswers", () => {
  test("hands back the share token and keeps the session id for the cookie", async () => {
    const out = await submitAnswers(VALID, async () =>
      json({ role: "originator", session_id: "sess-1", share_token: "tok-1" }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.sessionId).toBe("sess-1");
      expect(out.body).toEqual({ role: "originator", share_token: "tok-1" });
      // The session id is the identity itself -- it belongs in an httpOnly
      // cookie and nowhere JS can read it.
      expect(JSON.stringify(out.body)).not.toContain("sess-1");
    }
  });

  test("passes a responder's pair id through", async () => {
    const out = await submitAnswers({ ...VALID, invite_token: "abc" }, async () =>
      json({ role: "responder", session_id: "s2", share_token: "t2", pair_id: "p2" }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.body.pair_id).toBe("p2");
  });

  test("posts the submission upstream as JSON", async () => {
    let method = "";
    let sent: unknown = null;
    await submitAnswers(VALID, async (_input, init) => {
      method = String(init?.method);
      sent = JSON.parse(String(init?.body));
      return json({ role: "originator", session_id: "s", share_token: "t" });
    });
    expect(method).toBe("POST");
    expect(sent).toEqual(VALID);
  });

  test("refuses a malformed body without calling the backend", async () => {
    let called = false;
    const out = await submitAnswers({ name: "Ada" }, async () => {
      called = true;
      return json({});
    });
    expect(called).toBe(false);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(400);
  });

  test("surfaces the backend's own validation wording", async () => {
    const out = await submitAnswers(VALID, async () =>
      json({ detail: "Q9 needs exactly 2 choices, got 1" }, 400),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(400);
      expect(out.body.error).toBe("Q9 needs exactly 2 choices, got 1");
    }
  });

  test("an expired invite stays a 410", async () => {
    const out = await submitAnswers({ ...VALID, invite_token: "old" }, async () =>
      json({ detail: "this invite has expired" }, 410),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(410);
  });

  test("a rejected proxy key is our problem, reported as a 502", async () => {
    const out = await submitAnswers(VALID, async () => json({ detail: "nope" }, 401));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(502);
  });

  test("an upstream crash becomes a 503 with nothing internal in it", async () => {
    const out = await submitAnswers(VALID, async () =>
      json({ detail: "psycopg2 OperationalError at 10.0.0.4:5432" }, 500),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(503);
      expect(out.body.error).not.toContain("psycopg2");
    }
  });

  test("a backend that answers 200 with the wrong shape is not trusted", async () => {
    const out = await submitAnswers(VALID, async () => json({ role: "originator" }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/server/submitAnswers.test.ts`
Expected: FAIL — cannot resolve `./submitAnswers`.

- [ ] **Step 3: Implement**

Create `lib/server/submitAnswers.ts`:

```ts
import { weftFetch, type WeftErrorCode } from "@/lib/server/weftApi";
import type { AnswersRequest, AnswersResponse } from "@/lib/weftTypes";

/** What the browser is allowed to see: never the session id. */
export type ClientAnswers = {
  role: "originator" | "responder";
  share_token: string;
  pair_id?: string;
};

export type SubmitOutcome =
  | { ok: true; sessionId: string; body: ClientAnswers }
  | { ok: false; status: number; body: { error: string; code: WeftErrorCode } };

const MALFORMED = "That submission was incomplete. Please try again.";
const UNTRUSTED = "The service is unavailable right now. Please try again.";

function isAnswerValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isInteger(value);
  return Array.isArray(value) && value.every((v) => typeof v === "number" && Number.isInteger(v));
}

/**
 * Route Handlers are public endpoints, so the body is whatever someone sent.
 * This is a shape guard, not a validator -- the backend owns the real rules and
 * its 400s are worded for the person reading them.
 */
export function parseAnswersBody(raw: unknown): AnswersRequest | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { name, email, phone, answers, invite_token: token } = raw as Record<string, unknown>;
  if (typeof name !== "string" || typeof email !== "string" || typeof phone !== "string") {
    return null;
  }
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return null;
  const entries = Object.values(answers as Record<string, unknown>);
  if (entries.length === 0 || !entries.every(isAnswerValue)) return null;
  if (token !== undefined && typeof token !== "string") return null;

  return {
    name,
    email,
    phone,
    answers: answers as AnswersRequest["answers"],
    ...(token === undefined ? {} : { invite_token: token }),
  };
}

function isAnswersResponse(value: unknown): value is AnswersResponse {
  if (typeof value !== "object" || value === null) return false;
  const { role, session_id: sid, share_token: tok, pair_id: pid } = value as Record<string, unknown>;
  if (typeof sid !== "string" || typeof tok !== "string") return false;
  if (role === "originator") return true;
  return role === "responder" && typeof pid === "string";
}

/** Upstream meaning -> the status this proxy answers with. */
function httpStatusFor(code: WeftErrorCode): number {
  if (code === "validation") return 400;
  if (code === "not_found") return 404;
  if (code === "expired") return 410;
  // A rejected proxy key means we are misconfigured; the visitor did nothing wrong.
  if (code === "unauthorized") return 502;
  return 503;
}

export async function submitAnswers(
  raw: unknown,
  fetchImpl?: typeof fetch,
): Promise<SubmitOutcome> {
  const body = parseAnswersBody(raw);
  if (!body) {
    return { ok: false, status: 400, body: { error: MALFORMED, code: "validation" } };
  }

  const result = await weftFetch<unknown>(
    "/api/answers",
    { method: "POST", body: JSON.stringify(body) },
    fetchImpl,
  );

  if (!result.ok) {
    return {
      ok: false,
      status: httpStatusFor(result.code),
      body: { error: result.message, code: result.code },
    };
  }

  if (!isAnswersResponse(result.data)) {
    console.error("weft_core answered /api/answers with an unexpected shape");
    return { ok: false, status: 503, body: { error: UNTRUSTED, code: "unavailable" } };
  }

  const data = result.data;
  return {
    ok: true,
    sessionId: data.session_id,
    body: {
      role: data.role,
      share_token: data.share_token,
      ...(data.role === "responder" ? { pair_id: data.pair_id } : {}),
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test lib/server/submitAnswers.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Add the route handler**

Create `app/api/answers/route.ts`:

```ts
import { setSessionCookie } from "@/lib/server/session";
import { submitAnswers } from "@/lib/server/submitAnswers";

/**
 * The one write in the whole flow: it creates a session upstream (and, with an
 * invite token, a pair). The returned session id is put straight into the
 * httpOnly cookie and never sent to the browser -- the client only ever needs
 * the share token.
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const outcome = await submitAnswers(raw);

  if (!outcome.ok) {
    return Response.json(outcome.body, { status: outcome.status });
  }

  await setSessionCookie(outcome.sessionId);
  return Response.json(outcome.body);
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/server/submitAnswers.ts lib/server/submitAnswers.test.ts app/api/answers/route.ts
git commit -m "feat: proxy quiz submissions and hold identity in the cookie"
```

---

### Task 6: Copy and styles for the new screens

**Files:**
- Modify: `content.ts:386-448` (the `compatibilityTest` block)
- Modify: `content.test.ts:60-88` (the `compatibilityTest` describe block)
- Modify: `app/globals.css:871-879` (progress dots) and `:1005-1016` (the reduced-motion block)

**Interfaces:**
- Produces (Task 7 and Task 8 read these exact paths):
  - `content.compatibilityTest.intro` — unchanged keys, corrected `sub`
  - `content.compatibilityTest.helpers = { single, pick2 }`
  - `content.compatibilityTest.details = { eyebrow, headline, sub, fields: { name, email, phone }, cta, back, failed }`
  - `content.compatibilityTest.share = { eyebrow, headline, sub, copy, copied, note, restart }`
  - `content.compatibilityTest.loaderPhrases` — unchanged
- Removes: `content.compatibilityTest.questions` and `content.compatibilityTest.result`. The questions now come from the backend, and a solo archetype result is never shown.
- New CSS classes: `.ctest-progressbar`, `.ctest-progressbar-fill`, `.ctest-form`, `.ctest-label`, `.ctest-input`, `.ctest-input--bad`, `.ctest-error`, `.ctest-linkbox`.

- [ ] **Step 1: Replace the `compatibilityTest` copy block**

In `content.ts`, replace everything from `compatibilityTest: {` to the line before the closing `} as const;` with:

```ts
  compatibilityTest: {
    intro: {
      eyebrow: "Compatibility Test",
      headline: ["How do you", "really connect?"],
      sub: "Twenty questions, about four minutes. We read the signal between them, then hand you a link to send someone.",
      cta: "Begin",
    },
    helpers: {
      single: "Pick the one that fits",
      pick2: "Pick exactly two",
    },
    loaderPhrases: [
      "Reading the signal between your answers…",
      "Mapping your values…",
      "Finding your connection style…",
      "Weaving your thread…",
    ],
    details: {
      eyebrow: "Last thing",
      headline: "Where should we send your thread?",
      sub: "We need this to match you with whoever answers your link.",
      fields: { name: "Your name", email: "Email", phone: "Phone" },
      cta: "Get my link",
      back: "Back",
      failed: "We couldn't save that. Please try again.",
    },
    share: {
      eyebrow: "Your link is ready",
      headline: "Now send it to one person.",
      sub: "Compatibility takes two. Your result appears the moment someone answers your link — and you'll both see it.",
      copy: "Copy link",
      copied: "Copied ✓",
      note: "Keep this link. It's also how you come back to see your match.",
      restart: "Start over",
    },
  },
```

- [ ] **Step 2: Update the content tests**

In `content.test.ts`, replace the three tests that read `questions` and `result` (the `toHaveLength(3)` test, the `valid select kinds` test, and the `shareable archetype stats` test) with:

```ts
  test("intro no longer promises three questions", () => {
    // The served quiz is twenty questions long.
    expect(content.compatibilityTest.intro.sub).not.toContain("Three");
  });

  test("details step names every field the backend requires", () => {
    const d = content.compatibilityTest.details;
    expect(Object.keys(d.fields).sort()).toEqual(["email", "name", "phone"]);
    expect(d.cta).toBeTruthy();
  });

  test("share screen explains why one person is not a result", () => {
    const s = content.compatibilityTest.share;
    expect(s.copy).toBeTruthy();
    expect(s.copied).toBeTruthy();
    expect(s.note).toBeTruthy();
  });

  test("no solo archetype result survives in the copy", () => {
    expect("result" in content.compatibilityTest).toBe(false);
  });
```

Leave the `loaderPhrases` test as it is.

- [ ] **Step 3: Run the content tests**

Run: `bun test content.test.ts`
Expected: PASS

- [ ] **Step 4: Replace the progress dots with a bar, and add the form styles**

In `app/globals.css`, replace the `.ctest-progress` / `.ctest-dot` / `.ctest-dot--on` rules with:

```css
.ctest-progressbar {
  width: min(20rem, 62vw);
  height: 0.32rem;
  border-radius: 999px;
  background: rgb(18 18 18 / 12%);
  overflow: hidden;
  margin-bottom: clamp(1.5rem, 4vh, 2.75rem);
}
.ctest-progressbar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--color-ember);
  transition: width 420ms var(--ease-out-ui);
}

.ctest-form { display: grid; gap: 1.05rem; width: min(24rem, 100%); text-align: left; }
.ctest-label { display: grid; gap: 0.4rem; font-size: 0.875rem; font-weight: 500; color: var(--color-ink); }
.ctest-input {
  min-height: 3.25rem;
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgb(18 18 18 / 14%);
  background: color-mix(in srgb, var(--color-bone) 50%, transparent);
  padding: 0.9rem 1.15rem;
  font-size: 1rem;
  color: var(--color-ink);
  outline: none;
  transition: border-color 200ms var(--ease-out-ui), box-shadow 200ms var(--ease-out-ui);
}
.ctest-input:focus { border-color: var(--color-signal); background: var(--color-paper); box-shadow: 0 0 0 3px rgb(0 144 222 / 14%); }
.ctest-input--bad { border-color: var(--color-ember); }
.ctest-error { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-ember); }
.ctest-linkbox {
  width: min(28rem, 100%);
  border-radius: 1rem;
  border: 1px dashed rgb(18 18 18 / 18%);
  padding: 0.9rem 1.1rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: color-mix(in srgb, var(--color-ink) 72%, transparent);
  word-break: break-all;
}
```

In the `@media (prefers-reduced-motion: reduce)` block at the end of the file, replace `.ctest-dot,` with `.ctest-progressbar-fill,`.

- [ ] **Step 5: Confirm nothing still references the removed classes or copy**

```bash
grep -rn "ctest-dot\|ctest-progress \|compatibilityTest.result\|data.result" --include="*.ts" --include="*.tsx" --include="*.css" . --exclude-dir=node_modules --exclude-dir=docs || echo "no stale references"
```

Expected: only `components/compatibility/CompatibilityTest.tsx` appears — Task 8 rewrites it. Anything else must be fixed now.

- [ ] **Step 6: Commit**

```bash
git add content.ts content.test.ts app/globals.css
git commit -m "feat: write the details and share copy, and a progress bar that fits 20 questions"
```

---

### Task 7: The details form and the share screen

**Files:**
- Create: `components/compatibility/DetailsForm.tsx`
- Create: `components/compatibility/ShareScreen.tsx`
- Test: `components/compatibility/DetailsForm.test.tsx`
- Test: `components/compatibility/ShareScreen.test.tsx`

**Interfaces:**
- Consumes: `Details` / `DetailsErrors` / `validateDetails` / `hasErrors` / `trimDetails` (Task 3), `content.compatibilityTest.details` and `.share` (Task 6), `PremiumButton`.
- Produces:
  - `DetailsForm({ submitError, onBack, onSubmit }: { submitError: string | null; onBack: () => void; onSubmit: (details: Details) => void })`
  - `ShareScreen({ shareToken, onRestart }: { shareToken: string; onRestart: () => void })`

**Why validation runs on submit, not on every keystroke:** telling someone their email is wrong while they are still typing it is noise. Once a field has been rejected it re-validates as they fix it.

**Why `ShareScreen` builds its own URL:** the frontend owns the share link's shape (`/compatibility-test/invite/<token>`); the backend's placeholder `result.shareUrl` is ignored. `window.location.origin` is only readable after mount, so the URL fills in from an effect and the server-rendered markup carries no host.

- [ ] **Step 1: Write the failing tests**

Create `components/compatibility/DetailsForm.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailsForm } from "./DetailsForm";
import { content } from "@/content";

const noop = () => {};

test("details form asks for every field the backend requires", () => {
  const html = renderToStaticMarkup(
    <DetailsForm submitError={null} onBack={noop} onSubmit={noop} />,
  );
  expect(html).toContain(content.compatibilityTest.details.fields.name);
  expect(html).toContain(content.compatibilityTest.details.fields.email);
  expect(html).toContain(content.compatibilityTest.details.fields.phone);
  expect(html).toContain(content.compatibilityTest.details.cta);
});

test("details form uses the right input types and autocomplete hints", () => {
  const html = renderToStaticMarkup(
    <DetailsForm submitError={null} onBack={noop} onSubmit={noop} />,
  );
  expect(html).toContain('type="email"');
  expect(html).toContain('type="tel"');
  expect(html).toContain('autocomplete="name"');
});

test("details form shows a submit failure where it can be read", () => {
  const html = renderToStaticMarkup(
    <DetailsForm submitError="Backend said no" onBack={noop} onSubmit={noop} />,
  );
  expect(html).toContain("Backend said no");
  expect(html).toContain('role="alert"');
});
```

Create `components/compatibility/ShareScreen.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareScreen } from "./ShareScreen";
import { content } from "@/content";

test("share screen leads with the link and why it needs sending", () => {
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-1" onRestart={() => {}} />);
  expect(html).toContain(content.compatibilityTest.share.headline);
  expect(html).toContain(content.compatibilityTest.share.note);
  expect(html).toContain("/compatibility-test/invite/tok-1");
});

test("share screen never claims a compatibility result for one person", () => {
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-1" onRestart={() => {}} />);
  expect(html).not.toContain("ctest-meter");
  expect(html).not.toContain("archetype");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test components/compatibility/DetailsForm.test.tsx components/compatibility/ShareScreen.test.tsx`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Implement the details form**

Create `components/compatibility/DetailsForm.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { content } from "@/content";
import {
  hasErrors,
  trimDetails,
  validateDetails,
  type Details,
  type DetailsErrors,
} from "@/lib/details";

const EMPTY: Details = { name: "", email: "", phone: "" };

/**
 * The quiz asks for these only once the answers are in: the form arrives after
 * the effort, and it gates the thing the person came for.
 */
export function DetailsForm({
  submitError,
  onBack,
  onSubmit,
}: {
  submitError: string | null;
  onBack: () => void;
  onSubmit: (details: Details) => void;
}) {
  const copy = content.compatibilityTest.details;
  const [details, setDetails] = useState<Details>(EMPTY);
  const [errors, setErrors] = useState<DetailsErrors>({});

  function change(field: keyof Details, value: string) {
    const next = { ...details, [field]: value };
    setDetails(next);
    // Only re-check a field that has already been rejected -- complaining while
    // someone is still typing their email is noise.
    if (errors[field]) setErrors({ ...errors, [field]: validateDetails(next)[field] });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateDetails(details);
    setErrors(found);
    if (hasErrors(found)) return;
    onSubmit(trimDetails(details));
  }

  return (
    <div className="relative z-10 flex w-full flex-col items-center text-center">
      <span className="ctest-eyebrow">{copy.eyebrow}</span>
      <h2 className="ctest-prompt">{copy.headline}</h2>
      <p className="mt-2 max-w-sm text-pretty text-base leading-relaxed text-ink/60">
        {copy.sub}
      </p>

      <form className="ctest-form mt-8" noValidate onSubmit={submit}>
        <DetailsField
          autoComplete="name"
          error={errors.name}
          field="name"
          label={copy.fields.name}
          onChange={change}
          type="text"
          value={details.name}
        />
        <DetailsField
          autoComplete="email"
          error={errors.email}
          field="email"
          label={copy.fields.email}
          onChange={change}
          type="email"
          value={details.email}
        />
        <DetailsField
          autoComplete="tel"
          error={errors.phone}
          field="phone"
          label={copy.fields.phone}
          onChange={change}
          type="tel"
          value={details.phone}
        />

        {submitError && (
          <p className="ctest-error" role="alert">
            {submitError}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-4">
          <button
            className="font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
            onClick={onBack}
            type="button"
          >
            &larr; {copy.back}
          </button>
          <PremiumButton tone="ember" type="submit">
            {copy.cta}
          </PremiumButton>
        </div>
      </form>
    </div>
  );
}

function DetailsField({
  autoComplete,
  error,
  field,
  label,
  onChange,
  type,
  value,
}: {
  autoComplete: string;
  error?: string;
  field: keyof Details;
  label: string;
  onChange: (field: keyof Details, value: string) => void;
  type: "text" | "email" | "tel";
  value: string;
}) {
  const id = `ctest-${field}`;
  return (
    <label className="ctest-label" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        className={`ctest-input${error ? " ctest-input--bad" : ""}`}
        id={id}
        name={field}
        onChange={(event) => onChange(field, event.target.value)}
        type={type}
        value={value}
      />
      {error && (
        <span className="ctest-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
```

- [ ] **Step 4: Implement the share screen**

Create `components/compatibility/ShareScreen.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { content } from "@/content";
import { PremiumButton } from "@/components/ui/PremiumButton";

const COPIED_MS = 2000;

/**
 * Everything an originator gets: a link, and the reason to send it. No profile
 * and no score -- those only exist once a second person has answered.
 *
 * The link's shape is the frontend's to own, so it is built here from the
 * token rather than taken from the backend's placeholder share URL.
 */
export function ShareScreen({
  shareToken,
  onRestart,
}: {
  shareToken: string;
  onRestart: () => void;
}) {
  const copy = content.compatibilityTest.share;
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  // Only knowable in the browser, so the server-rendered markup carries a
  // relative link and the absolute one fills in on mount.
  useEffect(() => setOrigin(window.location.origin), []);

  const path = `/compatibility-test/invite/${shareToken}`;
  const shareUrl = `${origin}${path}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard unavailable -- the link stays on screen to copy by hand.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <div className="relative z-10 flex w-full flex-col items-center text-center">
      <span className="ctest-eyebrow">{copy.eyebrow}</span>
      <h2 className="ctest-prompt">{copy.headline}</h2>
      <p className="mt-3 max-w-md text-pretty text-base leading-relaxed text-ink/62">
        {copy.sub}
      </p>

      <p className="ctest-linkbox mt-7">{shareUrl.replace(/^https?:\/\//, "")}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <PremiumButton onClick={copyLink} tone="ember">
          {copied ? copy.copied : copy.copy}
        </PremiumButton>
        <button
          className="font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
          onClick={onRestart}
          type="button"
        >
          {copy.restart}
        </button>
      </div>

      <p aria-live="polite" className="ctest-copied mt-4 h-4">
        {copied ? "Link copied to clipboard" : ""}
      </p>
      <p className="mt-2 max-w-sm font-mono text-[0.68rem] leading-relaxed text-ink/45">
        {copy.note}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test components/compatibility/DetailsForm.test.tsx components/compatibility/ShareScreen.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add components/compatibility/DetailsForm.tsx components/compatibility/DetailsForm.test.tsx components/compatibility/ShareScreen.tsx components/compatibility/ShareScreen.test.tsx
git commit -m "feat: add the details step and the share-link screen"
```

---

### Task 8: Wire the live quiz end to end

**Files:**
- Modify: `components/compatibility/CompatibilityTest.tsx` (whole file)
- Modify: `components/compatibility/CompatibilityTest.test.tsx` (whole file)
- Modify: `app/compatibility-test/page.tsx` (whole file)
- Modify: `app/compatibility-test/page.test.tsx` (whole file)

**Interfaces:**
- Consumes: `loadBank` (Task 2), `toQuizQuestions` / `QuizQuestion` (Task 1), the state machine (Task 4), `toBackendAnswers` (Phase 1), `DetailsForm` / `ShareScreen` (Task 7), `content.compatibilityTest.helpers` (Task 6).
- Produces: `CompatibilityTest({ questions }: { questions: QuizQuestion[] })` — the component no longer reads questions from `content`.

**Why the questions arrive as a prop:** the bank is server data, and only a Server Component may fetch it. Passing it down keeps `weftFetch` (and the proxy key) off the client entirely, and makes the component trivially testable with a fixture.

**The double-submit guard is structural:** submitting moves the machine to `"submitting"`, which unmounts the form. There is no second button to press.

- [ ] **Step 1: Write the failing tests**

Replace the whole contents of `components/compatibility/CompatibilityTest.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompatibilityTest } from "./CompatibilityTest";
import { content } from "@/content";
import { toQuizQuestions } from "@/lib/compatibilityQuestions";
import type { BankQuestion } from "@/lib/weftTypes";

const BANK: BankQuestion[] = [
  { id: "Q1", prompt: "A question about a genie", kind: "single", seg: 1, options: ["a", "b"] },
  { id: "W2", prompt: "A question about two things", kind: "pick2", seg: 2, options: ["w", "x", "y"] },
];

const QUESTIONS = toQuizQuestions(BANK);

test("compatibility test renders the intro phase by default", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain(content.compatibilityTest.intro.cta);
  expect(html).toContain("ctest-shell");
});

test("compatibility test exposes a home link back to Weft", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).toContain('href="/"');
  expect(html).toContain("ctest-home");
});

test("compatibility intro does not leak later phases into static markup", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  expect(html).not.toContain("ctest-option");
  expect(html).not.toContain(content.compatibilityTest.details.cta);
  expect(html).not.toContain(content.compatibilityTest.share.headline);
  expect(html).not.toContain(BANK[0].prompt);
});
```

Replace the whole contents of `app/compatibility-test/page.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Page, { metadata } from "./page";

test("compatibility-test page renders the quiz shell", async () => {
  // No WEFT_API_URL in the test environment, so this exercises the fallback
  // path: the quiz must still render when the backend cannot be reached.
  const html = renderToStaticMarkup(await Page());
  expect(html).toContain("ctest-shell");
});

test("compatibility-test page sets its own metadata title", () => {
  expect(String(metadata.title)).toContain("Compatibility");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test components/compatibility/CompatibilityTest.test.tsx app/compatibility-test/page.test.tsx`
Expected: FAIL — `CompatibilityTest` takes no `questions` prop, and `Page` is not async.

- [ ] **Step 3: Rewrite the client component**

Replace the whole contents of `components/compatibility/CompatibilityTest.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { content } from "@/content";
import { WeaveLoader } from "@/components/ui/WeaveLoader";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { DetailsForm } from "@/components/compatibility/DetailsForm";
import { ShareScreen } from "@/components/compatibility/ShareScreen";
import { toBackendAnswers } from "@/lib/answers";
import type { QuizQuestion } from "@/lib/compatibilityQuestions";
import type { Details } from "@/lib/details";
import {
  ANALYZING_MS,
  backFromDetails,
  canAdvance,
  isSelected,
  nextQuizState,
  prevQuizState,
  progressFraction,
  toggleOption,
  type Answers,
  type Phase,
} from "@/lib/compatibility";

const AUTO_ADVANCE_MS = 460;

export function CompatibilityTest({ questions }: { questions: QuizQuestion[] }) {
  const reduce = Boolean(useReducedMotion());
  const data = content.compatibilityTest;

  const [phase, setPhase] = useState<Phase>("intro");
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [shareToken, setShareToken] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = questions[activeIndex];
  const required = question?.select ?? 1;

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  function advance() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const next = nextQuizState(activeIndex, questions.length);
    setPhase(next.phase);
    setActiveIndex(next.activeIndex);
  }

  function goBack() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const prev = prevQuizState(activeIndex);
    setPhase(prev.phase);
    setActiveIndex(prev.activeIndex);
  }

  function choose(optionId: string) {
    const next = toggleOption(answers, question.id, optionId, question.kind, question.select);
    setAnswers(next);
    // A single-choice question moves on by itself; a pick-two waits for both.
    const chosen = next[question.id]?.length ?? 0;
    if (question.kind === "single" && chosen > 0) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(advance, reduce ? 120 : AUTO_ADVANCE_MS);
    }
  }

  function reset() {
    setAnswers({});
    setActiveIndex(0);
    setShareToken("");
    setSubmitError(null);
    setPhase("intro");
  }

  /**
   * The only write in the flow. Moving to "submitting" unmounts the form, so
   * there is no second button to press -- that is the double-submit guard.
   */
  async function submit(details: Details) {
    setSubmitError(null);
    setPhase("submitting");
    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, answers: toBackendAnswers(answers, questions) }),
      });
      const body = (await response.json().catch(() => null)) as
        | { share_token?: string; error?: string }
        | null;

      if (!response.ok || !body?.share_token) {
        setSubmitError(body?.error ?? data.details.failed);
        setPhase("details");
        return;
      }

      setShareToken(body.share_token);
      setPhase("share");
    } catch {
      // Offline or the request never landed -- nothing was created, so the
      // form comes back with the answers still in state.
      setSubmitError(data.details.failed);
      setPhase("details");
    }
  }

  const fade = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -18, filter: "blur(6px)" },
      };
  const transition = {
    duration: reduce ? 0.01 : 0.42,
    ease: [0.23, 1, 0.32, 1] as const,
  };

  return (
    <div className="ctest-shell">
      <span aria-hidden className="ctest-ambient ctest-ambient--ember" />
      <span aria-hidden className="ctest-ambient ctest-ambient--signal" />
      <Link className="ctest-home" href="/">
        <span aria-hidden>&larr;</span> Weft
      </Link>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            {...fade}
            transition={transition}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <span className="ctest-eyebrow">{data.intro.eyebrow}</span>
            <h1 className="ctest-prompt">
              {data.intro.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-ink/60">
              {data.intro.sub}
            </p>
            <div className="mt-8">
              <PremiumButton
                tone="ember"
                onClick={() => {
                  setPhase("quiz");
                  setActiveIndex(0);
                }}
              >
                {data.intro.cta}
              </PremiumButton>
            </div>
          </motion.div>
        )}

        {phase === "quiz" && question && (
          <motion.div
            key={`q-${activeIndex}`}
            {...fade}
            transition={transition}
            className="relative z-10 flex w-full flex-col items-center text-center"
          >
            <div className="ctest-progressbar" aria-hidden>
              <span
                className="ctest-progressbar-fill"
                style={{ width: `${progressFraction(activeIndex, questions.length) * 100}%` }}
              />
            </div>
            <span className="ctest-eyebrow">
              Question {activeIndex + 1} of {questions.length}
            </span>
            <h2 className="ctest-prompt">{question.prompt}</h2>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink/45">
              {question.kind === "multi" ? data.helpers.pick2 : data.helpers.single}
            </p>
            <div
              className="ctest-grid"
              role={question.kind === "single" ? "radiogroup" : "group"}
              aria-label={question.prompt}
            >
              {question.options.map((option) => {
                const on = isSelected(answers, question.id, option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role={question.kind === "single" ? "radio" : "checkbox"}
                    aria-checked={on}
                    className={`ctest-option${on ? " ctest-option--on" : ""}`}
                    onClick={() => choose(option.id)}
                  >
                    <span>{option.label}</span>
                    <span aria-hidden className="ctest-option-check">
                      &#10003;
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex items-center gap-5">
              <button
                type="button"
                onClick={goBack}
                className="font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
              >
                &larr; Back
              </button>
              {question.kind === "multi" && (
                <PremiumButton
                  tone="ink"
                  onClick={advance}
                  disabled={!canAdvance(answers, question.id, required)}
                >
                  Next
                </PremiumButton>
              )}
            </div>
          </motion.div>
        )}

        {phase === "details" && (
          <motion.div key="details" {...fade} transition={transition} className="relative z-10 w-full">
            <DetailsForm
              submitError={submitError}
              onBack={() => {
                const back = backFromDetails(questions.length);
                setPhase(back.phase);
                setActiveIndex(back.activeIndex);
              }}
              onSubmit={submit}
            />
          </motion.div>
        )}

        {phase === "submitting" && (
          <motion.div
            key="submitting"
            {...fade}
            transition={transition}
            className="relative z-10 h-64 w-full max-w-md"
          >
            <WeaveLoader
              phrases={data.loaderPhrases}
              intervalMs={Math.round(ANALYZING_MS / data.loaderPhrases.length)}
            />
          </motion.div>
        )}

        {phase === "share" && (
          <motion.div key="share" {...fade} transition={transition} className="relative z-10 w-full">
            <ShareScreen shareToken={shareToken} onRestart={reset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite the server page**

Replace the whole contents of `app/compatibility-test/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CompatibilityTest } from "@/components/compatibility/CompatibilityTest";
import { toQuizQuestions } from "@/lib/compatibilityQuestions";
import { loadBank } from "@/lib/server/bank";

export const metadata: Metadata = {
  title: "Weft: Compatibility Test",
  description:
    "Twenty quick questions, then a link to send one person. Your compatibility appears when they answer.",
};

/**
 * The questions are server data, so they are fetched here and handed down --
 * that keeps the backend URL and proxy key out of the client bundle entirely.
 */
export default async function CompatibilityTestPage() {
  const { bank } = await loadBank();
  return (
    <main id="main-content">
      <CompatibilityTest questions={toQuizQuestions(bank.questions)} />
    </main>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test components/compatibility app/compatibility-test`
Expected: PASS (10 tests)

- [ ] **Step 6: Typecheck and lint the phase**

```bash
bunx tsc --noEmit 2>&1 | grep -vE "\.test\.tsx?\(" | grep -E "^(app|lib|components|content)" || echo "phase 2 source typechecks clean"
bun run lint 2>&1 | tail -5
```

Expected: `phase 2 source typechecks clean`, and lint reports no errors in the new files. (`*.test.*` files are filtered because `bun-test.d.ts` under-declares bun's matchers — a pre-existing condition on `main`.)

- [ ] **Step 7: Verify the offline fallback and the live path by hand**

With **no backend running**:

```bash
grep -q WEFT_API_URL .env.local 2>/dev/null || cp .env.example .env.local
bun run dev &
sleep 6
curl -s -D- -o /dev/null localhost:3000/api/bank | grep -i x-weft-bank-source
curl -s localhost:3000/compatibility-test | grep -c ctest-shell
```

Expected: `x-weft-bank-source: fallback`, and `1` — the quiz page renders with the backend down.

Then start the backend and check the live path:

```bash
(cd /Users/shearytan/documents/surnx/weft_core && uvicorn weft.api:app --port 8000 &) ; sleep 3
curl -s -D- -o /dev/null localhost:3000/api/bank | grep -i x-weft-bank-source
curl -s -X POST localhost:3000/api/answers -H 'Content-Type: application/json' \
  -d "$(bun -e "
const b=require('./lib/compatibility-questions.json');
const answers=Object.fromEntries(b.questions.map(q=>[q.id, q.kind==='pick2'?[0,1]:0]));
console.log(JSON.stringify({name:'Ada',email:'ada@example.com',phone:'+14155550100',answers}));
")" -D- | tail -20
```

Expected: `x-weft-bank-source: live` (restart `next dev` first if the fallback was memoised); the POST answers `200` with `{"role":"originator","share_token":"..."}`, a `set-cookie: weft_session=...; Max-Age=2592000; Path=/; HttpOnly; SameSite=lax` header, and **no `session_id` in the body**.

Stop both servers when done: `kill %1` and `pkill -f "uvicorn weft.api"`.

- [ ] **Step 8: Commit**

```bash
git add components/compatibility/CompatibilityTest.tsx components/compatibility/CompatibilityTest.test.tsx app/compatibility-test/page.tsx app/compatibility-test/page.test.tsx
git commit -m "feat: take the real quiz and finish on a share link"
```

---

## Phase 2 Exit Gate

**Stop here. Do not begin Phase 3.**

Run the full suite and verify:

```bash
bun test 2>&1 | tail -5
git log --oneline main..HEAD
git status --short
```

- [ ] `bun test` passes, with only the 4 pre-existing `main` failures (`Turn`, `Nav`, `Faq`, `Hero`) still red — and no new ones
- [ ] `bunx tsc --noEmit` reports no errors in `app/`, `lib/`, `components/`, or `content.ts` source files
- [ ] An originator can go intro → 20 questions → details → share link, against a live backend
- [ ] With the backend stopped, `/compatibility-test` still renders and `/api/bank` reports `x-weft-bank-source: fallback`
- [ ] `POST /api/answers` sets `weft_session` (httpOnly, `Max-Age=2592000`) and returns **no** `session_id`
- [ ] A submit failure returns the visitor to the details form with their answers intact
- [ ] No solo profile, archetype, or score is shown anywhere
- [ ] No `NEXT_PUBLIC_` and no `WEFT_API_URL` reference outside `lib/server/weftApi.ts`
- [ ] All work committed on `feat/bff-foundation`; `main` untouched

Report what changed, test counts, deviations, and anything Phase 3 must know — in particular that `/compatibility-test/invite/[token]` does not exist yet, so the share link 404s until Phase 3 builds it.

Then **wait for explicit approval**.

---

## Subsequent phases

- **Phase 3** — responder path: `/api/invite/[token]`, `/api/pair/[id]`, the invite landing, and the pair result
- **Phase 4** — matches page, error screens, and hardening
