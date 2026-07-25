# Weft Integration — Phase 1: BFF Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-side foundation the frontend needs to talk to `weft_core` — a single module that knows the backend URL, a session-cookie helper, shared types, and the pure adapter that converts UI answers into the backend's format. No pages or routes are wired in this phase.

**Architecture:** Everything here is a library, not a route. `lib/server/weftApi.ts` is the only module that reads `WEFT_API_URL`/`WEFT_PROXY_KEY`; it returns a discriminated `WeftResult<T>` rather than throwing, so route handlers in Phase 2 map results to responses without touching upstream details. `lib/answers.ts` is pure and fully unit-tested.

**Tech Stack:** Next.js 16.2.11 (App Router), TypeScript strict, `bun test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-25-weft-backend-frontend-integration-design.md`
**Preceded by:** Phase 0 (backend contract), complete on `weft_core` branch `feat/bff-contract`.

## Global Constraints

- **Repo:** `/Users/shearytan/Documents/SurnX/web-frontend`, on a new branch `feat/bff-foundation` cut from `main`. Never commit to `main`.
- **No new dependencies.** Node's built-in `fetch`, `AbortSignal.timeout`, and `next/headers` only.
- **Next.js 16 breaking changes that this plan depends on** (verified in `node_modules/next/dist/docs/`):
  - **`cookies()` is async** — always `const store = await cookies()`. It was synchronous in Next 14 and earlier.
  - **Cookies can only be *set* in a Route Handler or Server Function**, never during Server Component render. Reading is fine anywhere on the server.
  - **Route Handlers are not cached by default**; caching a `GET` requires explicit opt-in.
  - **Route Handlers are public HTTP endpoints** — never leak upstream URLs, secrets, or raw upstream error bodies to the client.
- **Server-only secrets.** `WEFT_API_URL` and `WEFT_PROXY_KEY` are never prefixed `NEXT_PUBLIC_` and never imported by a client component.
- **Tests colocate** as `lib/**/<name>.test.ts`, matching the existing `lib/compatibility.test.ts` convention, and run with `bun test`.
- **Exit gate:** this phase ends at Task 5. Stop, report, and wait for explicit approval before starting Phase 2.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/weftTypes.ts` | Shared request/response types mirroring the Phase 0 contract |
| `lib/answers.ts` | Pure: UI answers → backend answers; completeness check |
| `lib/answers.test.ts` | Unit tests for the adapter |
| `lib/server/weftApi.ts` | The only module that knows `WEFT_API_URL`; proxy key, timeout, status mapping |
| `lib/server/weftApi.test.ts` | Unit tests for status mapping and fetch behaviour (injected fetch, no network) |
| `lib/server/session.ts` | `weft_session` cookie name, options, read/set helpers |
| `lib/server/session.test.ts` | Unit tests for the pure cookie-options function |
| `.env.example` | Documents the two server-only variables |

---

### Task 1: Branch and shared contract types

**Files:**
- Create: `lib/weftTypes.ts`

**Interfaces:**
- Produces: the types every later task and phase imports.
  - `BackendAnswers = Record<string, number | number[]>`
  - `AnswersRequest { name; email; phone; answers: BackendAnswers; invite_token?: string }`
  - `OriginatorResponse { role: "originator"; session_id: string; share_token: string }`
  - `ResponderResponse { role: "responder"; session_id: string; share_token: string; pair_id: string }`
  - `AnswersResponse = OriginatorResponse | ResponderResponse`
  - `BankResponse { questions: BankQuestion[]; question_set: string[] }`
  - `InviteResponse { from_name: string; question_set: string[]; questions: BankQuestion[] }`
  - `PairPerson { name; top_values: ValueEntry[]; humour; opens_up; pace; life_stage }`
  - `PairResult { headline; band; shared_values: ValueEntry[]; difference; people: [PairPerson, PairPerson] }`

- [ ] **Step 1: Create the branch**

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend
git checkout main
git checkout -b feat/bff-foundation
git branch --show-current
```

Expected: `feat/bff-foundation`

- [ ] **Step 2: Write the types**

Create `lib/weftTypes.ts`:

```ts
// Mirrors the weft_core contract (see its README "The API").
// Kept in one file so a backend contract change has exactly one place to land.

/** Backend answer shape: single questions take an index, pick-2 take two. */
export type BackendAnswers = Record<string, number | number[]>;

export type AnswersRequest = {
  name: string;
  email: string;
  phone: string;
  answers: BackendAnswers;
  /** Omit to start a chain; present means answering someone's invite. */
  invite_token?: string;
};

export type OriginatorResponse = {
  role: "originator";
  session_id: string;
  share_token: string;
};

export type ResponderResponse = {
  role: "responder";
  session_id: string;
  share_token: string;
  pair_id: string;
};

/** Discriminated on `role` — the presence of invite_token decides which. */
export type AnswersResponse = OriginatorResponse | ResponderResponse;

export type BankOption = { id: string; label: string };

export type BankQuestion = {
  id: string;
  prompt: string;
  kind: "single" | "multi";
  helper?: string;
  select?: number;
  segment?: number;
  options: BankOption[];
};

export type BankResponse = {
  questions: BankQuestion[];
  question_set: string[];
};

export type InviteResponse = {
  from_name: string;
  question_set: string[];
  questions: BankQuestion[];
};

export type ValueEntry = {
  key: string;
  name: string;
  tagline: string;
  blurb: string;
};

/** One person inside a pair result. Never raw scores, never their answers. */
export type PairPerson = {
  name: string;
  top_values: ValueEntry[];
  humour: string;
  opens_up: string;
  pace: string;
  life_stage: string;
};

export type PairResult = {
  headline: string;
  band: string;
  shared_values: ValueEntry[];
  difference: string;
  people: PairPerson[];
};

export type PairSummary = PairResult & { pair_id: string };

export type PairsResponse = { pairs: PairSummary[] };
```

- [ ] **Step 3: Verify it compiles**

Run: `bunx tsc --noEmit 2>&1 | grep weftTypes || echo "weftTypes clean"`
Expected: `weftTypes clean`

- [ ] **Step 4: Commit**

```bash
git add lib/weftTypes.ts
git commit -m "feat: add shared weft_core contract types"
```

---

### Task 2: The answer adapter

**Files:**
- Create: `lib/answers.ts`
- Test: `lib/answers.test.ts`

**Interfaces:**
- Consumes: `BackendAnswers` (Task 1), `QuizQuestion` from `lib/compatibilityQuestions.ts`, `Answers` from `lib/compatibility.ts`.
- Produces:
  - `optionIndex(optionId: string, questionId: string): number` — `"Q9-0"` → `0`; throws on a malformed or mismatched id.
  - `toBackendAnswers(answers: Answers, questions: readonly QuizQuestion[]): BackendAnswers`
  - `unansweredQuestions(answers: Answers, questions: readonly QuizQuestion[]): string[]` — Phase 2 uses this to gate submit.

**Why an index and not the label:** the backend refers to options **by position** (`validate_answers` takes ints), and option order is fixed. The option id's numeric suffix was built for exactly this.

- [ ] **Step 1: Write the failing tests**

Create `lib/answers.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { optionIndex, toBackendAnswers, unansweredQuestions } from "./answers";
import type { QuizQuestion } from "./compatibilityQuestions";

const QUESTIONS: QuizQuestion[] = [
  {
    id: "Q1",
    prompt: "Single question",
    kind: "single",
    options: [
      { id: "Q1-0", label: "a" },
      { id: "Q1-1", label: "b" },
      { id: "Q1-2", label: "c" },
    ],
  },
  {
    id: "Q9",
    prompt: "Pick two",
    kind: "multi",
    select: 2,
    options: [
      { id: "Q9-0", label: "w" },
      { id: "Q9-1", label: "x" },
      { id: "Q9-2", label: "y" },
    ],
  },
];

describe("optionIndex", () => {
  test("reads the index off the option id", () => {
    expect(optionIndex("Q1-2", "Q1")).toBe(2);
    expect(optionIndex("Q9-0", "Q9")).toBe(0);
  });

  test("rejects an id that does not belong to the question", () => {
    expect(() => optionIndex("Q1-0", "Q9")).toThrow();
  });

  test("rejects a malformed id", () => {
    expect(() => optionIndex("Q1-x", "Q1")).toThrow();
    expect(() => optionIndex("Q1", "Q1")).toThrow();
  });
});

describe("toBackendAnswers", () => {
  test("single questions become a bare index", () => {
    const out = toBackendAnswers({ Q1: ["Q1-2"], Q9: ["Q9-0", "Q9-1"] }, QUESTIONS);
    expect(out.Q1).toBe(2);
  });

  test("pick-two questions become an array of indices", () => {
    const out = toBackendAnswers({ Q1: ["Q1-0"], Q9: ["Q9-0", "Q9-2"] }, QUESTIONS);
    expect(out.Q9).toEqual([0, 2]);
  });

  test("omits questions that were not answered", () => {
    const out = toBackendAnswers({ Q1: ["Q1-0"] }, QUESTIONS);
    expect(out).toEqual({ Q1: 0 });
  });

  test("ignores answers to questions outside the served set", () => {
    // The backend rejects a stray qid outright, so never send one.
    const out = toBackendAnswers({ Q1: ["Q1-0"], Q999: ["Q999-0"] }, QUESTIONS);
    expect(Object.keys(out)).toEqual(["Q1"]);
  });
});

describe("unansweredQuestions", () => {
  test("lists nothing when every question is properly answered", () => {
    expect(
      unansweredQuestions({ Q1: ["Q1-0"], Q9: ["Q9-0", "Q9-1"] }, QUESTIONS),
    ).toEqual([]);
  });

  test("lists a question with no selection", () => {
    expect(unansweredQuestions({ Q9: ["Q9-0", "Q9-1"] }, QUESTIONS)).toEqual(["Q1"]);
  });

  test("a pick-two with one selection is still unanswered", () => {
    expect(unansweredQuestions({ Q1: ["Q1-0"], Q9: ["Q9-0"] }, QUESTIONS)).toEqual(["Q9"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/answers.test.ts`
Expected: FAIL — cannot resolve `./answers`.

- [ ] **Step 3: Implement**

Create `lib/answers.ts`:

```ts
import type { Answers } from "@/lib/compatibility";
import type { QuizQuestion } from "@/lib/compatibilityQuestions";
import type { BackendAnswers } from "@/lib/weftTypes";

/**
 * Option ids are `<questionId>-<index>`, where the index is the option's
 * position in the served question. The backend identifies options by position,
 * so the suffix is the wire value -- not a cosmetic id.
 */
export function optionIndex(optionId: string, questionId: string): number {
  const prefix = `${questionId}-`;
  if (!optionId.startsWith(prefix)) {
    throw new Error(`option ${optionId} does not belong to ${questionId}`);
  }
  const raw = optionId.slice(prefix.length);
  const index = Number(raw);
  if (raw === "" || !Number.isInteger(index) || index < 0) {
    throw new Error(`option ${optionId} has no valid index`);
  }
  return index;
}

/** How many selections a question needs: pick-2 says so, everything else is 1. */
function requiredCount(question: QuizQuestion): number {
  return question.select ?? 1;
}

/**
 * UI answers (keyed by option id) -> the backend's positional format.
 * Unanswered questions are omitted and unknown question ids are dropped: the
 * backend rejects a stray qid outright, so there is no value in forwarding one.
 */
export function toBackendAnswers(
  answers: Answers,
  questions: readonly QuizQuestion[],
): BackendAnswers {
  const out: BackendAnswers = {};
  for (const question of questions) {
    const selected = answers[question.id] ?? [];
    if (selected.length === 0) continue;
    const indices = selected.map((id) => optionIndex(id, question.id));
    out[question.id] = question.kind === "multi" ? indices : indices[0];
  }
  return out;
}

/**
 * Questions still needing an answer. The backend refuses a partial submission,
 * so the UI gates on this rather than discovering it from a 400.
 */
export function unansweredQuestions(
  answers: Answers,
  questions: readonly QuizQuestion[],
): string[] {
  return questions
    .filter((q) => (answers[q.id]?.length ?? 0) !== requiredCount(q))
    .map((q) => q.id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test lib/answers.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/answers.ts lib/answers.test.ts
git commit -m "feat: add the UI-to-backend answer adapter"
```

---

### Task 3: The backend client

**Files:**
- Create: `lib/server/weftApi.ts`
- Test: `lib/server/weftApi.test.ts`

**Interfaces:**
- Consumes: types from Task 1.
- Produces:
  - `type WeftResult<T> = { ok: true; data: T } | { ok: false; status: number; code: WeftErrorCode; message: string }`
  - `type WeftErrorCode = "validation" | "not_found" | "expired" | "unauthorized" | "unavailable"`
  - `mapUpstreamStatus(status: number): WeftErrorCode` — pure.
  - `weftFetch<T>(path: string, init?: RequestInit, fetchImpl?: typeof fetch): Promise<WeftResult<T>>`

**Why a result object instead of throwing:** route handlers in Phase 2 need to turn an upstream 410 into a friendly "expired" screen. A typed result makes that a `switch`, and it guarantees no upstream body or URL reaches the client by accident.

- [ ] **Step 1: Write the failing tests**

Create `lib/server/weftApi.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { mapUpstreamStatus, weftFetch } from "./weftApi";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.WEFT_API_URL = "https://api.example.test";
  delete process.env.WEFT_PROXY_KEY;
});

describe("mapUpstreamStatus", () => {
  test("maps the statuses the backend actually returns", () => {
    expect(mapUpstreamStatus(400)).toBe("validation");
    expect(mapUpstreamStatus(404)).toBe("not_found");
    expect(mapUpstreamStatus(410)).toBe("expired");
    expect(mapUpstreamStatus(401)).toBe("unauthorized");
    expect(mapUpstreamStatus(403)).toBe("unauthorized");
  });

  test("anything else is a service problem, not a user problem", () => {
    expect(mapUpstreamStatus(500)).toBe("unavailable");
    expect(mapUpstreamStatus(502)).toBe("unavailable");
    expect(mapUpstreamStatus(418)).toBe("unavailable");
  });
});

describe("weftFetch", () => {
  test("returns parsed data on success", async () => {
    const res = await weftFetch<{ hello: string }>("/api/bank", undefined, async () =>
      jsonResponse({ hello: "world" }),
    );
    expect(res).toEqual({ ok: true, data: { hello: "world" } });
  });

  test("calls the configured base url with the given path", async () => {
    let seen = "";
    await weftFetch("/api/bank", undefined, async (input) => {
      seen = String(input);
      return jsonResponse({});
    });
    expect(seen).toBe("https://api.example.test/api/bank");
  });

  test("sends the proxy key when one is configured", async () => {
    process.env.WEFT_PROXY_KEY = "s3cret";
    let key: string | null = null;
    await weftFetch("/api/bank", undefined, async (_input, init) => {
      key = new Headers(init?.headers).get("X-Weft-Proxy-Key");
      return jsonResponse({});
    });
    expect(key).toBe("s3cret");
  });

  test("omits the proxy key header when unset", async () => {
    let has = true;
    await weftFetch("/api/bank", undefined, async (_input, init) => {
      has = new Headers(init?.headers).has("X-Weft-Proxy-Key");
      return jsonResponse({});
    });
    expect(has).toBe(false);
  });

  test("maps an upstream error status to a code", async () => {
    const res = await weftFetch("/api/pair/nope", undefined, async () =>
      jsonResponse({ detail: "unknown pair" }, 404),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(404);
      expect(res.code).toBe("not_found");
    }
  });

  test("passes the backend's validation message through", async () => {
    // A 400 is the user's problem and its wording is written for them.
    const res = await weftFetch("/api/answers", undefined, async () =>
      jsonResponse({ detail: "missing answers for: Q1" }, 400),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe("missing answers for: Q1");
  });

  test("never leaks an upstream server error body", async () => {
    const res = await weftFetch("/api/bank", undefined, async () =>
      jsonResponse({ detail: "psycopg2 OperationalError at 10.0.0.4:5432" }, 500),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).not.toContain("psycopg2");
      expect(res.message).not.toContain("10.0.0.4");
    }
  });

  test("a network failure becomes unavailable, not a throw", async () => {
    const res = await weftFetch("/api/bank", undefined, async () => {
      throw new Error("ECONNREFUSED 127.0.0.1:8000");
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("unavailable");
      expect(res.message).not.toContain("ECONNREFUSED");
    }
  });

  test("a missing base url is a configuration error, surfaced as unavailable", async () => {
    delete process.env.WEFT_API_URL;
    const res = await weftFetch("/api/bank", undefined, async () => jsonResponse({}));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("unavailable");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/server/weftApi.test.ts`
Expected: FAIL — cannot resolve `./weftApi`.

- [ ] **Step 3: Implement**

Create `lib/server/weftApi.ts`:

```ts
/**
 * The only module that knows how to reach weft_core. Server-side use only.
 *
 * Route handlers call this and map the result; nothing else reads WEFT_API_URL
 * or the proxy key, so the backend's address and secret have exactly one home.
 *
 * Why no `import "server-only"` guard: that is a separate package and this
 * phase adds no dependencies. The secret cannot reach the browser regardless --
 * Next.js only inlines env vars prefixed NEXT_PUBLIC_, so these read as
 * undefined in any client bundle. Adding `server-only` later would upgrade an
 * accidental client import from "silently broken" to "build error", which is
 * worth doing if this module ever grows.
 */

const TIMEOUT_MS = 8000;

export type WeftErrorCode =
  | "validation"
  | "not_found"
  | "expired"
  | "unauthorized"
  | "unavailable";

export type WeftResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: WeftErrorCode; message: string };

const GENERIC_FAILURE = "The service is unavailable right now. Please try again.";

/** Upstream status -> what it means for the person using the site. */
export function mapUpstreamStatus(status: number): WeftErrorCode {
  if (status === 400) return "validation";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 410) return "expired";
  return "unavailable";
}

function failure(status: number, message: string): WeftResult<never> {
  return { ok: false, status, code: mapUpstreamStatus(status), message };
}

export async function weftFetch<T>(
  path: string,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<WeftResult<T>> {
  const base = process.env.WEFT_API_URL;
  if (!base) {
    // Misconfiguration, not a user error -- say nothing specific to the client.
    console.error("WEFT_API_URL is not set; cannot reach the backend");
    return failure(503, GENERIC_FAILURE);
  }

  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const key = process.env.WEFT_PROXY_KEY;
  if (key) headers.set("X-Weft-Proxy-Key", key);

  let response: Response;
  try {
    response = await fetchImpl(`${base}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (reason) {
    // Timeouts and refused connections carry host details -- log, never return.
    console.error("weft_core request failed", reason);
    return failure(503, GENERIC_FAILURE);
  }

  if (!response.ok) {
    const code = mapUpstreamStatus(response.status);
    // A 400 is written for the person who typed it; anything else is internal.
    let message = GENERIC_FAILURE;
    if (code === "validation" || code === "not_found" || code === "expired") {
      const body = await response.json().catch(() => null);
      const detail = (body as { detail?: unknown } | null)?.detail;
      if (typeof detail === "string") message = detail;
    }
    if (code === "unavailable" || code === "unauthorized") {
      console.error("weft_core returned", response.status);
    }
    return { ok: false, status: response.status, code, message };
  }

  const data = (await response.json()) as T;
  return { ok: true, data };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test lib/server/weftApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/server/weftApi.ts lib/server/weftApi.test.ts
git commit -m "feat: add the server-only weft_core client"
```

---

### Task 4: The session cookie

**Files:**
- Create: `lib/server/session.ts`
- Test: `lib/server/session.test.ts`

**Interfaces:**
- Produces:
  - `SESSION_COOKIE = "weft_session"`
  - `SESSION_MAX_AGE_SECONDS` — 30 days, matching `WEFT_INVITE_TTL_DAYS`.
  - `sessionCookieOptions(isProduction: boolean)` — pure, testable.
  - `readSessionId(): Promise<string | null>`
  - `setSessionCookie(sessionId: string): Promise<void>` — **Route Handlers only.**

**Next 16 constraints this encodes:** `cookies()` is async, and a cookie can only be *set* from a Route Handler or Server Function — never during Server Component render. `secure` is off in development because a Secure cookie is silently dropped over plain-HTTP localhost.

- [ ] **Step 1: Write the failing tests**

Create `lib/server/session.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "./session";

describe("session cookie", () => {
  test("is named for the app and lives as long as an invite", () => {
    expect(SESSION_COOKIE).toBe("weft_session");
    // 30 days, matching WEFT_INVITE_TTL_DAYS -- a session cookie would strand
    // an originator who closed their browser before their friend answered.
    expect(SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 30);
  });

  test("is unreadable by JS and scoped to the whole site", () => {
    const opts = sessionCookieOptions(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });

  test("is Secure in production", () => {
    expect(sessionCookieOptions(true).secure).toBe(true);
  });

  test("is not Secure in development", () => {
    // A Secure cookie is silently dropped over plain-HTTP localhost.
    expect(sessionCookieOptions(false).secure).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/server/session.test.ts`
Expected: FAIL — cannot resolve `./session`.

- [ ] **Step 3: Implement**

Create `lib/server/session.ts`:

```ts
import { cookies } from "next/headers";

/**
 * Identity without accounts: the backend hands back a session_id, and this
 * cookie is where it lives. httpOnly keeps it out of reach of JS, and keeping
 * it in a cookie rather than a URL means the id never appears in a link
 * someone could share by accident.
 */
export const SESSION_COOKIE = "weft_session";

/** 30 days, matching the backend's WEFT_INVITE_TTL_DAYS. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function sessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    // Dropped by the browser over plain-HTTP localhost, so development opts out.
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/** Readable anywhere on the server. Returns null when nobody has answered yet. */
export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Route Handlers only. Next.js cannot set a cookie during Server Component
 * render -- the response headers are already on their way.
 */
export async function setSessionCookie(sessionId: string): Promise<void> {
  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    sessionId,
    sessionCookieOptions(process.env.NODE_ENV === "production"),
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test lib/server/session.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/server/session.ts lib/server/session.test.ts
git commit -m "feat: add the weft_session cookie helpers"
```

---

### Task 5: Environment documentation and full verification

**Files:**
- Create: `.env.example`
- Modify: `.gitignore` (only if `.env*.local` is not already ignored)

- [ ] **Step 1: Confirm local env files are git-ignored**

```bash
grep -n "env" .gitignore
```

If `.env*.local` is not covered, add it:

```
# local env files
.env*.local
```

- [ ] **Step 2: Create `.env.example`**

```bash
# Copy to .env.local for development. Both are SERVER-ONLY:
# never prefix them NEXT_PUBLIC_, or the backend URL and shared secret
# would be inlined into the browser bundle.

# Where weft_core is reachable. Locally: uvicorn weft.api:app --reload
WEFT_API_URL=http://localhost:8000

# Shared secret sent as X-Weft-Proxy-Key. Must match WEFT_PROXY_KEY in
# weft_core. Leave empty locally -- the backend skips the check when unset.
WEFT_PROXY_KEY=
```

- [ ] **Step 3: Verify the whole phase**

```bash
bun test lib/ 2>&1 | tail -5
bunx tsc --noEmit 2>&1 | grep -E "lib/(answers|weftTypes|server)" || echo "phase 1 files typecheck clean"
grep -rn "NEXT_PUBLIC" lib/ || echo "no client-exposed env vars"
```

Expected: all `lib/` tests pass; no typecheck errors in the new files; no `NEXT_PUBLIC` usage.

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "docs: document the server-only backend env vars"
```

---

## Phase 1 Exit Gate

**Stop here. Do not begin Phase 2.**

Verify and report:

- [ ] `bun test lib/` passes, including the new adapter, client, and cookie tests
- [ ] New files typecheck clean
- [ ] `weftFetch` never returns an upstream 5xx body or a network error string
- [ ] The proxy key is sent when configured and omitted when not
- [ ] No `NEXT_PUBLIC_` anywhere in `lib/`
- [ ] Existing tests still green
- [ ] All work committed on `feat/bff-foundation`; `main` untouched

Report what changed, test counts, deviations, and anything Phase 2 must know.
Then **wait for explicit approval**.

---

## Subsequent phases

- **Phase 2** — `/api/bank` + `/api/answers` route handlers, the details step, originator share-link screen
- **Phase 3** — responder path and pair result
- **Phase 4** — matches page and hardening
