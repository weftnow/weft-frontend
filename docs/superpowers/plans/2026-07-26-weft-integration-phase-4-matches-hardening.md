# Weft Integration — Phase 4: Originator Return & Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The person who started a thread can come back later and see every match it produced — and the flow they came through stops carrying the loose ends the first three phases left in it.

**Architecture:** One new SSR page, `/compatibility-test/matches`, reads the httpOnly `weft_session` cookie server-side and lists the pairs that session belongs to via a new `lib/server/myPairs.ts` helper. Nobody has answered yet is a first-class state, not an empty list: it offers a freshly minted invite link, which is the one thing in this whole integration a *client* genuinely needs to ask the server for — so `POST /api/invite` becomes the phase's single Route Handler. Everything else in the phase is hardening: closing the carried minors from Phases 2 and 3, and finally exercising the double-submit guard in a real browser.

**Tech Stack:** Next.js 16.2.11 (App Router), React 19.2.4, TypeScript strict, Tailwind v4, `bun test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-25-weft-backend-frontend-integration-design.md` (Phase 4 bullet, line 267)
**Preceded by:** Phase 0 (`weft_core` branch `feat/bff-contract`), Phases 1–3 (this repo, branch `feat/bff-foundation`). All complete.

---

## Global Constraints

- **Repo:** `/Users/shearytan/Documents/SurnX/web-frontend`, continuing on the existing branch `feat/bff-foundation`. **Never commit to `main`.**
- **Sibling repo:** `weft_core` at `/Users/shearytan/documents/surnx/weft_core`, branch `feat/bff-contract`. **This phase requires no backend change.** If a task appears to need one, stop and report — that is a plan defect, not a licence to edit the backend.
- **No new dependencies.** Built-in `fetch`, `next/headers`, `next/link`, React, Tailwind classes already in the codebase.
- **Server-only secrets.** `WEFT_API_URL` / `WEFT_PROXY_KEY` are read *only* inside `lib/server/weftApi.ts`. Never `NEXT_PUBLIC_`, never imported by a client component.
- **The `session_id` never reaches the browser.** It lives only in the httpOnly `weft_session` cookie and is read server-side via `readSessionId()`. No task may put it in a URL, a prop, or a JSON body sent to the client.
- **Tests colocate** as `<name>.test.ts(x)` beside the file, and run with `bun test`.
- **Baseline before this phase starts:** `bun test` → **224 pass, 4 fail**. The four failures are pre-existing and unrelated (`content.test.ts` placeholder-catalog flag, `Hero.test.tsx` ×2, `Turn.test.tsx`). **Do not fix them here; do not add to them.** Any fifth failure is yours.
- **`bunx tsc --noEmit` must stay at 0 errors.** It is a real gate as of Phase 3 Task 1.
- **`bunx eslint` must stay at 0 errors.** Warnings are currently 4 (3 pre-existing `no-img-element`, 1 intentional `_score` unused-destructure in `lib/server/pair.test.ts`).
- **`PremiumButton` explodes its label into per-glyph `<span>`s.** Assert on `aria-label="…"`, never on the visible label text.
- **`renderToStaticMarkup` HTML-escapes apostrophes** (`'` → `&#x27;`). Copy containing an apostrophe must be compared through the `escapeApostrophes` helper introduced in Task 9 — **check whether Task 9 has landed before writing a test that needs it**; if it has not, inline `.replace(/'/g, "&#x27;")` and Task 9 will consolidate.
- **No component in this phase may call `useRouter()`.** Every component test renders with `renderToStaticMarkup` outside an App Router context, where `useRouter()` throws. Use `next/link` for navigation and `window.location.assign` inside event handlers.
- **Copy lives in `content.ts`.** No user-visible string may be written inline in a component. Task 10 removes the three that Phase 2 left behind; do not add more.

### Verified backend contract

Read directly from `weft_core@feat/bff-contract` (HEAD `e6f674f`). All error bodies are `{"detail": "<string>"}`; `lib/server/weftApi.ts` already turns `detail` into `message` for 400/404/410 and swallows it otherwise.

**`GET /api/session/{session_id}/pairs`** (`weft/api.py:191-198`):

```jsonc
{ "pairs": [
    { "pair_id": "UFDZcyU7axZZ7-7vgGGFcg",
      // ...then exactly the GET /api/pair/{id} body, spread in:
      "headline": "Ana and Ben both lead with Benevolence.",
      "score": 0.1544,                       // -1..1, rounded to 4 places
      "band": "A real mix — some deep overlap, some genuine difference.",
      "shared_values": [ { "key": "BE", "name": "…", "tagline": "…", "blurb": "…" } ],
      "difference": "Where you differ most is …",
      "people": [ { "name": "Ana", "top_values": [ /* ValueEntry */ ],
                    "humour": "…", "opens_up": "…", "pace": "…", "life_stage": "…" } ] } ] }
```

- unknown session id → **404** `unknown session`
- a session with no pairs yet → **200** `{"pairs": []}`
- **Newest first** (`storage.py:74-77` and `postgres_storage.py:97-103` both sort `created_at desc`). The page relies on this order and does not re-sort.
- A pair is "yours" if you are on **either** side, so a responder who later returns sees the pair they completed too.
- **The payload does not say which of the two people the viewer is.** `people[0]` is `session_a`, `people[1]` is `session_b`, and neither session id travels. The matches UI therefore names **both** people on every card — exactly as `PairResultView` already does. Do not attempt to infer "you"; there is nothing to infer it from. *(Accepted limitation, recorded here so it is chosen rather than discovered.)*

**`POST /api/invite`** (`weft/api.py:163-167`):

```jsonc
// request
{ "session_id": "…" }
// 200
{ "token": "M5SSA6bEFBvQLpNocwzm2A" }
```

- unknown session id → **404** `unknown session`
- Invites are **not single-use** and there is no cap: minting a second link for a session that already has one is a supported, side-effect-light operation.

**`lib/weftTypes.ts` already declares `PairResult`, `PairPerson` and `ValueEntry` matching the above.** Task 1 adds `PairSummary` alongside them; no existing type changes.

### Deviation from the spec's route map — read before Task 2

The spec's BFF route table lists `GET /api/my/pairs` as a Route Handler. **This plan does not build it**, for the same reason Phase 3 did not build `GET /api/invite/[token]` or `GET /api/pair/[id]`: the matches page is a Server Component, so it reaches the backend through `weftFetch` server-to-server already. A Route Handler nobody calls is dead code and a public endpoint widening the attack surface for nothing. `lib/server/myPairs.ts` holds the logic and carries the tests.

**`POST /api/invite` *is* built** (Task 2), and it is the first handler in the integration that earns its existence: the reshare button on the matches page is a client component asking the server to mint a token, which is precisely what a Route Handler is for. It also completes the pattern — handlers exist exactly where a browser calls them.

The user approved this same deviation for Phase 3 with it flagged. **The final reviewer must confirm it once more at the exit gate.**

### One item of the spec's Phase 4 bullet is already done

The bullet lists `copy fixes ("three questions" → 20)`. **Phase 2 Task 6 already did this**, and `content.test.ts:65` (`"intro no longer promises three questions"`) guards it. The intro reads "Twenty questions, about four minutes." Do not go looking for it, and do not re-fix it — verify the guard is still green and move on.

### Next.js 16 facts this plan depends on

Verified in `node_modules/next/dist/docs/`:

- `params` and `searchParams` are `Promise`s and must be awaited (`03-api-reference/03-file-conventions/dynamic-routes.md`).
- `cookies()` is async and must be awaited; **reading it opts the route into dynamic rendering**, so `/compatibility-test/matches` needs no explicit `dynamic` export — but Task 8 sets `export const dynamic = "force-dynamic"` anyway, matching the pair page, so the intent is legible rather than incidental.
- `metadata.robots` accepts `{ index: false, follow: false }` (`04-functions/generate-metadata.md:551`).
- Route Handlers are not cached by default and are public HTTP endpoints.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/weftTypes.ts` *(modify)* | Add `PairSummary` — a `PairResult` carrying its own `pair_id` |
| `lib/server/myPairs.ts` *(create)* | `loadMyPairs()` — ok / no_session / not_found / unavailable |
| `lib/server/myPairs.test.ts` *(create)* | Status mapping, shape guard, empty-list case, order preservation |
| `lib/server/mintInvite.ts` *(create)* | `mintInvite()` — ok / no_session / not_found / unavailable |
| `lib/server/mintInvite.test.ts` *(create)* | Status mapping and the shape guard |
| `app/api/invite/route.ts` *(create)* | `POST` — cookie in, `{token}` out. The phase's only Route Handler |
| `app/api/invite/route.test.ts` *(create)* | Status codes for each outcome; no `session_id` in the response |
| `content.ts` *(modify)* | `matches` copy block; the three strings Task 10 lifts out of `CompatibilityTest` |
| `content.test.ts` *(modify)* | Exact-match assertion for the `matches` block and the new `quiz` strings |
| `app/globals.css` *(modify)* | Match-card list styles; deletion of four dead rule sets (Task 11) |
| `components/compatibility/MatchCard.tsx` *(create)* | One pair, compact: names, band, percentage, link to the full result |
| `components/compatibility/MatchCard.test.tsx` *(create)* | Both names, gauge width, href, no leaked raw score |
| `components/compatibility/MatchesView.tsx` *(create)* | The list of match cards plus its heading |
| `components/compatibility/MatchesView.test.tsx` *(create)* | Ordering preserved, count in the heading, one card per pair |
| `components/compatibility/ReshareLink.tsx` *(create)* | Client: mint-a-link button → `ShareLink`. The waiting state's whole point |
| `components/compatibility/ReshareLink.test.tsx` *(create)* | Idle markup, no fetch on render, no token in the server-rendered HTML |
| `app/compatibility-test/matches/page.tsx` *(create)* | SSR: cookie → `loadMyPairs()` → one of five screens |
| `app/compatibility-test/matches/page.test.tsx` *(create)* | Each of the five screens, noindex metadata |
| `components/compatibility/ShareScreen.tsx` *(modify)* | Points the returning originator at `/compatibility-test/matches` |
| `components/compatibility/ShareScreen.test.tsx` *(modify)* | The new link is present |
| `components/compatibility/PairResultView.tsx` *(modify)* | Same link, for the person who just landed on a result |
| `components/compatibility/PairResultView.test.tsx` *(modify)* | The new link is present |
| `lib/compatibility.ts` *(modify)* | `ANALYZING_MS` → `LOADER_CYCLE_MS` |
| `lib/compatibility.test.ts` *(modify)* | Follows the rename |
| `components/compatibility/CompatibilityTest.tsx` *(modify)* | Fetch timeout; terminal pair-failure state; the rename; copy moved to `content.ts` |
| `components/compatibility/CompatibilityTest.test.tsx` *(modify)* | The three lifted strings render from content |
| `lib/submitOutcome.ts` *(modify)* | New `"stranded"` decision for a pair that exists upstream but could not be reached |
| `lib/submitOutcome.test.ts` *(modify)* | The stranded case |
| `lib/testEscape.ts` *(create)* | `escapeApostrophes()` — replaces the two duplicated, mis-named `escaped()` helpers |
| `lib/testEscape.test.ts` *(create)* | Apostrophes and the ampersand it must not silently miss |

---

### Task 1: `loadMyPairs()` — the session's matches, newest first

**Files:**
- Modify: `lib/weftTypes.ts` (append `PairSummary` after `PairResult`)
- Create: `lib/server/myPairs.ts`
- Test: `lib/server/myPairs.test.ts`

**Interfaces:**
- Consumes: `weftFetch`, `WeftResult` from `lib/server/weftApi.ts`; `isPairResult` from `lib/server/pair.ts`; `readSessionId` from `lib/server/session.ts`; `PairResult` from `lib/weftTypes.ts`.
- Produces:
  - `type PairSummary = PairResult & { pair_id: string }` (exported from `lib/weftTypes.ts`)
  - `type MyPairsOutcome = { status: "ok"; pairs: PairSummary[] } | { status: "no_session" } | { status: "not_found" } | { status: "unavailable" }`
  - `function isPairSummary(value: unknown): value is PairSummary`
  - `async function loadMyPairs(sessionId: string | null, fetchImpl?: typeof fetch): Promise<MyPairsOutcome>`

**Note the signature:** `loadMyPairs` takes the session id as an argument rather than calling `readSessionId()` itself. `readSessionId()` needs a request context that `bun test` does not have, so a helper that called it could not be unit-tested at all. The page reads the cookie and passes the value down — see Task 8.

- [ ] **Step 1: Write the failing test**

Create `lib/server/myPairs.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { isPairSummary, loadMyPairs } from "./myPairs";

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "Looking after your people",
  blurb: "You show up for the people close to you.",
};

const PERSON = {
  name: "Ana",
  top_values: [VALUE],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

const SUMMARY = {
  pair_id: "pair-1",
  headline: "Ana and Ben both lead with Benevolence.",
  score: 0.1544,
  band: "A real mix.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

/** A fetch that answers once, with whatever status and body the test wants. */
function stub(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("isPairSummary", () => {
  test("accepts a pair carrying its own id", () => {
    expect(isPairSummary(SUMMARY)).toBe(true);
  });

  test("rejects a pair with no id, which could not be linked to", () => {
    const { pair_id: _id, ...noId } = SUMMARY;
    expect(isPairSummary(noId)).toBe(false);
  });

  test("rejects an id that is not a string", () => {
    expect(isPairSummary({ ...SUMMARY, pair_id: 7 })).toBe(false);
  });

  test("still enforces everything a pair result must have", () => {
    // The id is additive; it does not loosen the underlying guard.
    expect(isPairSummary({ ...SUMMARY, score: Number.NaN })).toBe(false);
    expect(isPairSummary({ ...SUMMARY, people: [PERSON] })).toBe(false);
  });
});

describe("loadMyPairs", () => {
  test("no cookie means nobody has answered on this browser", async () => {
    // Not an error, and not worth an upstream round trip: it is the ordinary
    // state of someone who has never taken the quiz here.
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    expect(await loadMyPairs(null, spy)).toEqual({ status: "no_session" });
    expect(called).toBe(false);
  });

  test("an empty session id is treated the same as no cookie", async () => {
    expect(await loadMyPairs("", stub(200, {}))).toEqual({ status: "no_session" });
  });

  test("returns the pairs in the order the backend sent them", async () => {
    const second = { ...SUMMARY, pair_id: "pair-2" };
    const outcome = await loadMyPairs("sess-1", stub(200, { pairs: [second, SUMMARY] }));

    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") throw new Error("unreachable");
    // Newest first is the backend's ordering; nothing here re-sorts it.
    expect(outcome.pairs.map((p) => p.pair_id)).toEqual(["pair-2", "pair-1"]);
  });

  test("no pairs yet is a result, not a failure", async () => {
    // Someone who shared a link an hour ago and is checking back.
    expect(await loadMyPairs("sess-1", stub(200, { pairs: [] }))).toEqual({
      status: "ok",
      pairs: [],
    });
  });

  test("a session the backend has never heard of maps to not_found", async () => {
    // A cookie that outlived its session -- a backend restart, or a wiped
    // in-memory store. The person needs to start again, not retry.
    expect(await loadMyPairs("stale", stub(404, { detail: "unknown session" }))).toEqual({
      status: "not_found",
    });
  });

  test("a rejected proxy key is our problem, not the visitor's", async () => {
    expect(await loadMyPairs("sess-1", stub(401, { detail: "nope" }))).toEqual({
      status: "unavailable",
    });
  });

  test("a backend having a moment maps to unavailable", async () => {
    expect(await loadMyPairs("sess-1", stub(503, {}))).toEqual({ status: "unavailable" });
  });

  test("a body with no pairs array is unrenderable, not empty", async () => {
    // Silently showing "no matches yet" for a malformed payload would tell
    // someone their friend never answered when in fact we could not read it.
    expect(await loadMyPairs("sess-1", stub(200, { pairs: "none" }))).toEqual({
      status: "unavailable",
    });
    expect(await loadMyPairs("sess-1", stub(200, {}))).toEqual({ status: "unavailable" });
  });

  test("one unrenderable pair sinks the response rather than vanishing", async () => {
    // Dropping the bad entry would show 1 of 2 matches with no sign the other
    // existed. Better to say we could not read it.
    const broken = { ...SUMMARY, pair_id: "pair-2", band: 9 };
    expect(await loadMyPairs("sess-1", stub(200, { pairs: [SUMMARY, broken] }))).toEqual({
      status: "unavailable",
    });
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test lib/server/myPairs.test.ts`
Expected: FAIL — `Cannot find module './myPairs'`.

- [ ] **Step 3: Add `PairSummary` to `lib/weftTypes.ts`**

Append immediately after the existing `PairResult` type:

```ts
/**
 * A pair as it appears in someone's list of matches: the same friend-safe
 * result, plus the id needed to link to its own page. The backend spreads the
 * one into the other (`weft/api.py:197`), so the shapes cannot drift apart.
 */
export type PairSummary = PairResult & { pair_id: string };
```

- [ ] **Step 4: Write `lib/server/myPairs.ts`**

```ts
import { isPairResult } from "@/lib/server/pair";
import { weftFetch } from "@/lib/server/weftApi";
import type { PairSummary } from "@/lib/weftTypes";

/**
 * What the matches page can be. `no_session` is deliberately not folded into
 * `not_found`: "you have not taken this yet" and "the thread you took is gone"
 * are different facts, and only the second is worth an apology.
 */
export type MyPairsOutcome =
  | { status: "ok"; pairs: PairSummary[] }
  | { status: "no_session" }
  | { status: "not_found" }
  | { status: "unavailable" };

/** Matches lib/server/pair.ts. Nothing near this cap is a real session id. */
const MAX_ID_LENGTH = 128;

export function isPairSummary(value: unknown): value is PairSummary {
  if (!isPairResult(value)) return false;
  return typeof (value as PairSummary).pair_id === "string";
}

/**
 * Every pair this session belongs to, on either side, newest first.
 *
 * The session id is passed in rather than read here: `readSessionId()` needs a
 * request context, and a helper that reached for one could not be unit-tested.
 * The page owns the cookie read.
 */
export async function loadMyPairs(
  sessionId: string | null,
  fetchImpl?: typeof fetch,
): Promise<MyPairsOutcome> {
  if (!sessionId || sessionId.length > MAX_ID_LENGTH) return { status: "no_session" };

  const result = await weftFetch<unknown>(
    `/api/session/${encodeURIComponent(sessionId)}/pairs`,
    { method: "GET" },
    fetchImpl,
  );

  if (!result.ok) {
    if (result.code === "not_found") return { status: "not_found" };
    // Including `unauthorized`: a rejected proxy key is our misconfiguration,
    // and the visitor can do nothing with that information.
    return { status: "unavailable" };
  }

  const pairs = (result.data as { pairs?: unknown } | null)?.pairs;
  if (!Array.isArray(pairs) || !pairs.every(isPairSummary)) {
    console.error("weft_core returned an unrenderable pair list");
    return { status: "unavailable" };
  }

  return { status: "ok", pairs };
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `bun test lib/server/myPairs.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 6: Confirm nothing else moved**

Run: `bun test && bunx tsc --noEmit`
Expected: 236 pass / 4 fail; tsc silent.

- [ ] **Step 7: Commit**

```bash
git add lib/weftTypes.ts lib/server/myPairs.ts lib/server/myPairs.test.ts
git commit -m "feat: read every match a session belongs to"
```

---

### Task 2: Mint a fresh invite — helper and the phase's one Route Handler

**Files:**
- Create: `lib/server/mintInvite.ts`
- Test: `lib/server/mintInvite.test.ts`
- Create: `app/api/invite/route.ts`
- Test: `app/api/invite/route.test.ts`

**Interfaces:**
- Consumes: `weftFetch` from `lib/server/weftApi.ts`; `readSessionId` from `lib/server/session.ts`.
- Produces:
  - `type MintOutcome = { status: "ok"; token: string } | { status: "no_session" } | { status: "not_found" } | { status: "unavailable" }`
  - `async function mintInvite(sessionId: string | null, fetchImpl?: typeof fetch): Promise<MintOutcome>`
  - `POST /api/invite` → `200 {token}` | `401 {error}` | `404 {error}` | `503 {error}`

**Why this handler exists when Phase 3 built none:** the reshare button in Task 6 is a client component. A browser needs an endpoint. That is the whole test, and this is the only thing in the integration that passes it.

- [ ] **Step 1: Write the failing helper test**

Create `lib/server/mintInvite.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { mintInvite } from "./mintInvite";

function stub(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("mintInvite", () => {
  test("returns the token the backend minted", async () => {
    expect(await mintInvite("sess-1", stub(200, { token: "tok-9" }))).toEqual({
      status: "ok",
      token: "tok-9",
    });
  });

  test("sends the session id in the body and never in the path", async () => {
    // The id is a secret held in an httpOnly cookie. A path segment ends up in
    // access logs and referrers; a POST body does not.
    let seenUrl = "";
    let seenBody = "";
    const spy = (async (url: string, init: RequestInit) => {
      seenUrl = url;
      seenBody = String(init.body);
      return new Response(JSON.stringify({ token: "tok-9" }), { status: 200 });
    }) as unknown as typeof fetch;

    await mintInvite("sess-1", spy);
    expect(seenUrl.endsWith("/api/invite")).toBe(true);
    expect(seenUrl).not.toContain("sess-1");
    expect(JSON.parse(seenBody)).toEqual({ session_id: "sess-1" });
  });

  test("no cookie means there is nothing to mint against", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    expect(await mintInvite(null, spy)).toEqual({ status: "no_session" });
    expect(called).toBe(false);
  });

  test("a session the backend has forgotten maps to not_found", async () => {
    expect(await mintInvite("stale", stub(404, { detail: "unknown session" }))).toEqual({
      status: "not_found",
    });
  });

  test("anything else is unavailable", async () => {
    expect(await mintInvite("sess-1", stub(503, {}))).toEqual({ status: "unavailable" });
    expect(await mintInvite("sess-1", stub(401, {}))).toEqual({ status: "unavailable" });
  });

  test("a 200 with no usable token is unavailable, not a blank link", async () => {
    // Rendering an empty token would produce a share URL ending in a slash,
    // which looks like a link and leads nowhere.
    expect(await mintInvite("sess-1", stub(200, { token: "" }))).toEqual({
      status: "unavailable",
    });
    expect(await mintInvite("sess-1", stub(200, { token: 7 }))).toEqual({
      status: "unavailable",
    });
    expect(await mintInvite("sess-1", stub(200, {}))).toEqual({ status: "unavailable" });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/server/mintInvite.test.ts`
Expected: FAIL — `Cannot find module './mintInvite'`.

- [ ] **Step 3: Write `lib/server/mintInvite.ts`**

```ts
import { weftFetch } from "@/lib/server/weftApi";

/**
 * Minting a second link for a session is supported and cheap: invites are not
 * single-use and there is no cap (`weft/api.py:163-167`).
 */
export type MintOutcome =
  | { status: "ok"; token: string }
  | { status: "no_session" }
  | { status: "not_found" }
  | { status: "unavailable" };

const MAX_ID_LENGTH = 128;

export async function mintInvite(
  sessionId: string | null,
  fetchImpl?: typeof fetch,
): Promise<MintOutcome> {
  if (!sessionId || sessionId.length > MAX_ID_LENGTH) return { status: "no_session" };

  const result = await weftFetch<unknown>(
    "/api/invite",
    { method: "POST", body: JSON.stringify({ session_id: sessionId }) },
    fetchImpl,
  );

  if (!result.ok) {
    if (result.code === "not_found") return { status: "not_found" };
    return { status: "unavailable" };
  }

  const token = (result.data as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || token === "") {
    console.error("weft_core minted an unusable invite token");
    return { status: "unavailable" };
  }

  return { status: "ok", token };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test lib/server/mintInvite.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the failing route test**

Create `app/api/invite/route.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { respondWithMint } from "./route";

describe("respondWithMint", () => {
  test("hands the token back and nothing else", async () => {
    const response = respondWithMint({ status: "ok", token: "tok-9" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token: "tok-9" });
  });

  test("no cookie is 401, because the fix is to take the quiz", async () => {
    const response = respondWithMint({ status: "no_session" });
    expect(response.status).toBe(401);
  });

  test("a forgotten session is 404", async () => {
    expect(respondWithMint({ status: "not_found" }).status).toBe(404);
  });

  test("anything else is 503", async () => {
    expect(respondWithMint({ status: "unavailable" }).status).toBe(503);
  });

  test("no failure body ever carries a session id or an upstream detail", async () => {
    for (const outcome of [
      { status: "no_session" },
      { status: "not_found" },
      { status: "unavailable" },
    ] as const) {
      const body = JSON.stringify(await respondWithMint(outcome).json());
      expect(body).not.toContain("session_id");
      expect(body).not.toContain("weft_core");
    }
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `bun test app/api/invite/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 7: Write `app/api/invite/route.ts`**

The handler is split so the mapping is testable without a request: `bun test` cannot supply the request context `cookies()` needs.

```ts
import { mintInvite, type MintOutcome } from "@/lib/server/mintInvite";
import { readSessionId } from "@/lib/server/session";

/**
 * Outcome -> HTTP, kept separate from POST so it can be tested without a
 * request context. `cookies()` throws outside one, and `bun test` has none.
 *
 * The bodies are deliberately bare. The client shows its own copy from
 * content.ts; anything the backend said is for the log, not the browser.
 */
export function respondWithMint(outcome: MintOutcome): Response {
  if (outcome.status === "ok") return Response.json({ token: outcome.token });
  if (outcome.status === "no_session") {
    return Response.json({ error: "no_session" }, { status: 401 });
  }
  if (outcome.status === "not_found") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json({ error: "unavailable" }, { status: 503 });
}

/**
 * Mint another share link for whoever holds the cookie. The only endpoint in
 * this integration a browser actually calls for data -- everything else is a
 * Server Component reaching weft_core directly.
 */
export async function POST() {
  return respondWithMint(await mintInvite(await readSessionId()));
}
```

- [ ] **Step 8: Run it and watch it pass**

Run: `bun test app/api/invite/route.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 9: Confirm the whole suite and the typecheck**

Run: `bun test && bunx tsc --noEmit`
Expected: 247 pass / 4 fail; tsc silent.

- [ ] **Step 10: Commit**

```bash
git add lib/server/mintInvite.ts lib/server/mintInvite.test.ts app/api/invite/route.ts app/api/invite/route.test.ts
git commit -m "feat: mint a fresh share link for a returning originator"
```

---

### Task 3: The matches copy

**Files:**
- Modify: `content.ts` (inside `compatibilityTest`, after the `pair` block)
- Test: `content.test.ts`

**Interfaces:**
- Produces: `content.compatibilityTest.matches`, consumed by Tasks 4, 5, 6, 7, 8.

Copy is written and asserted before any component reads it, so no component ever has to invent a string.

- [ ] **Step 1: Write the failing test**

Add to `content.test.ts`, inside the existing `describe("compatibility test content", …)` block, after the pair-screen test:

```ts
  test("the matches screen matches the approved copy exactly", () => {
    expect(content.compatibilityTest.matches).toEqual({
      eyebrow: "Your threads",
      headline: "Everyone who's answered you.",
      // {count} is filled in by the page; the singular form avoids "1 matches".
      countOne: "One person has answered your link.",
      countMany: "{count} people have answered your link.",
      open: "See the full result",
      waiting: {
        eyebrow: "Nothing yet",
        headline: "Nobody's answered your link yet.",
        body: "Compatibility takes two. Send your link to one more person — the result appears the moment they finish.",
        cta: "Get a fresh link",
        failed: "We couldn't make a new link just now. Please try again.",
      },
      none: {
        eyebrow: "Nothing here yet",
        headline: "You haven't taken this yet.",
        body: "Answer twenty questions, send the link you get, and this is where your results will be.",
        cta: "Take the test",
      },
      lost: {
        eyebrow: "Thread not found",
        headline: "We've lost track of your thread.",
        body: "This browser remembers taking the test, but we can no longer find it. Starting again takes about four minutes.",
        cta: "Start again",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. Your thread is safe — try again shortly.",
        cta: "Try again",
      },
    });
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test content.test.ts`
Expected: FAIL — `matches` is `undefined`.

- [ ] **Step 3: Add the copy to `content.ts`**

Insert inside `compatibilityTest`, immediately after the closing brace of the `pair` block and before the closing brace of `compatibilityTest`:

```ts
    matches: {
      eyebrow: "Your threads",
      headline: "Everyone who's answered you.",
      // {count} is filled in by the page; the singular form avoids "1 matches".
      countOne: "One person has answered your link.",
      countMany: "{count} people have answered your link.",
      open: "See the full result",
      waiting: {
        eyebrow: "Nothing yet",
        headline: "Nobody's answered your link yet.",
        body: "Compatibility takes two. Send your link to one more person — the result appears the moment they finish.",
        cta: "Get a fresh link",
        failed: "We couldn't make a new link just now. Please try again.",
      },
      none: {
        eyebrow: "Nothing here yet",
        headline: "You haven't taken this yet.",
        body: "Answer twenty questions, send the link you get, and this is where your results will be.",
        cta: "Take the test",
      },
      lost: {
        eyebrow: "Thread not found",
        headline: "We've lost track of your thread.",
        body: "This browser remembers taking the test, but we can no longer find it. Starting again takes about four minutes.",
        cta: "Start again",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We couldn't reach the service.",
        body: "Something on our side is having a moment. Your thread is safe — try again shortly.",
        cta: "Try again",
      },
    },
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test content.test.ts`
Expected: PASS. (`content.test.ts` also holds one of the four known pre-existing failures — the placeholder-catalog test. It must still be exactly one failure in this file.)

- [ ] **Step 5: Commit**

```bash
git add content.ts content.test.ts
git commit -m "feat: write the matches-screen copy"
```

---

### Task 4: `MatchCard` — one pair, compact

**Files:**
- Create: `components/compatibility/MatchCard.tsx`
- Test: `components/compatibility/MatchCard.test.tsx`
- Modify: `app/globals.css` (append after the `.ctest-trait-value` rule, before the `@media (prefers-reduced-motion: reduce)` block)

**Interfaces:**
- Consumes: `PairSummary` from `lib/weftTypes.ts`; `scorePercent` from `lib/pairView.ts`; `pairHref` from `lib/links.ts`; `content.compatibilityTest.matches` from Task 3.
- Produces: `function MatchCard({ pair }: { pair: PairSummary })` — a Server Component.

A card is not a shrunken `PairResultView`: it carries the headline, the band, the percentage and a link. The profiles stay on the pair page, which is what the link is for.

**No share token is passed to `pairHref` here.** The token belongs to whoever just finished; a returning originator following their own match link is not handing out a capability, and appending one would put an invite token into their browser history for no reason.

- [ ] **Step 1: Write the failing test**

Create `components/compatibility/MatchCard.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchCard } from "./MatchCard";
import type { PairSummary } from "@/lib/weftTypes";

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "Looking after your people",
  blurb: "You show up for the people close to you.",
};

const PERSON = {
  name: "Ana",
  top_values: [VALUE],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

const PAIR: PairSummary = {
  pair_id: "pair-1",
  headline: "Ana and Ben both lead with Benevolence.",
  score: 0.1544,
  band: "A real mix — some deep overlap, some genuine difference.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

test("the card names both people and states the band", () => {
  const html = renderToStaticMarkup(<MatchCard pair={PAIR} />);
  // Nothing in the payload says which of the two is reading, so the card
  // names both rather than guessing at "you".
  expect(html).toContain("Ana and Ben both lead with Benevolence.");
  expect(html).toContain("A real mix");
});

test("the percentage matches the one the full result will show", () => {
  const html = renderToStaticMarkup(<MatchCard pair={PAIR} />);
  // Same scorePercent as PairResultView, so the card and the page it opens
  // can never disagree.
  expect(html).toContain(">44<");
  expect(html).toContain("width:44%");
});

test("the card links to its own pair page", () => {
  const html = renderToStaticMarkup(<MatchCard pair={PAIR} />);
  expect(html).toContain('href="/compatibility-test/pair/pair-1"');
});

test("the link carries no share token", () => {
  // A returning originator is not handing out a capability, and a token in
  // their history is a token that can leak from it.
  const html = renderToStaticMarkup(<MatchCard pair={PAIR} />);
  expect(html).not.toContain("?share=");
});

test("a pair id is encoded rather than trusted as URL syntax", () => {
  const html = renderToStaticMarkup(
    <MatchCard pair={{ ...PAIR, pair_id: "a/b?c" }} />,
  );
  expect(html).toContain('href="/compatibility-test/pair/a%2Fb%3Fc"');
});

test("the card never leaks the raw score", () => {
  const html = renderToStaticMarkup(<MatchCard pair={PAIR} />);
  expect(html).not.toContain("0.1544");
});

test("a negative score still paints a bar", () => {
  const html = renderToStaticMarkup(<MatchCard pair={{ ...PAIR, score: -0.6 }} />);
  expect(html).toContain("width:9%");
  expect(html).not.toContain("width:-");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test components/compatibility/MatchCard.test.tsx`
Expected: FAIL — `Cannot find module './MatchCard'`.

- [ ] **Step 3: Write `components/compatibility/MatchCard.tsx`**

```tsx
import Link from "next/link";
import { content } from "@/content";
import { pairHref } from "@/lib/links";
import { scorePercent } from "@/lib/pairView";
import type { PairSummary } from "@/lib/weftTypes";

/**
 * One match, at a glance. Not a shrunken pair result: the headline, the band
 * and the number, and a link to the page that carries the profiles.
 *
 * No share token rides along in the href. The token belongs to whoever just
 * finished; someone reviewing their own matches is not handing out a
 * capability, and putting one in their history only risks leaking it.
 */
export function MatchCard({ pair }: { pair: PairSummary }) {
  const copy = content.compatibilityTest.matches;
  const percent = scorePercent(pair.score);

  return (
    <li className="ctest-match">
      <Link className="ctest-match-link" href={pairHref(pair.pair_id)}>
        <p className="ctest-match-headline">{pair.headline}</p>
        <p className="ctest-match-band">{pair.band}</p>

        <div className="ctest-match-meter">
          <span className="ctest-match-percent" aria-hidden>
            {percent}
            <span className="ctest-match-unit">%</span>
          </span>
          <span
            className="ctest-gauge-track"
            role="img"
            aria-label={`${content.compatibilityTest.pair.scoreLabel} ${percent} out of 100`}
          >
            <span className="ctest-gauge-fill" style={{ width: `${percent}%` }} />
          </span>
        </div>

        <span className="ctest-match-open">{copy.open} &rarr;</span>
      </Link>
    </li>
  );
}
```

- [ ] **Step 4: Add the styles**

Append to `app/globals.css`, after the `.ctest-trait-value` rule:

```css
.ctest-matches { display: grid; gap: 1rem; margin: 0; padding: 0; list-style: none; }

.ctest-match { display: block; }
.ctest-match-link {
  display: grid;
  gap: 0.6rem;
  border-radius: 1.1rem;
  border: 1px solid rgb(18 18 18 / 10%);
  background: rgb(255 255 255 / 55%);
  padding: 1.25rem 1.4rem;
  text-decoration: none;
  transition: transform 160ms var(--ease-out-ui), border-color 180ms ease;
}
.ctest-match-link:hover {
  transform: translate3d(0, -2px, 0);
  border-color: color-mix(in srgb, var(--color-ember) 45%, transparent);
}
.ctest-match-link:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-signal) 70%, white);
  outline-offset: 3px;
}

.ctest-match-headline {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--color-ink);
  /* A headline is built from two names someone typed; it must wrap, not push. */
  overflow-wrap: anywhere;
}
.ctest-match-band {
  font-size: 0.9rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--color-ink) 62%, transparent);
}

.ctest-match-meter { display: flex; align-items: center; gap: 0.75rem; }
.ctest-match-percent {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}
.ctest-match-unit { font-size: 0.7em; opacity: 0.55; }
/* The track and fill are shared with the pair page's gauge, so a card and the
   page it opens are drawn by the same rules. */
.ctest-match-meter .ctest-gauge-track { flex: 1; }

.ctest-match-open {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink) 52%, transparent);
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `bun test components/compatibility/MatchCard.test.tsx`
Expected: PASS, 7 tests.

If `width:44%` fails, check `.ctest-gauge-track` and `.ctest-gauge-fill` still exist in `globals.css` — the card reuses them rather than redefining them.

- [ ] **Step 6: Commit**

```bash
git add components/compatibility/MatchCard.tsx components/compatibility/MatchCard.test.tsx app/globals.css
git commit -m "feat: show one match at a glance"
```

---

### Task 5: `MatchesView` — the list

**Files:**
- Create: `components/compatibility/MatchesView.tsx`
- Test: `components/compatibility/MatchesView.test.tsx`

**Interfaces:**
- Consumes: `MatchCard` (Task 4); `CtestShell`; `Eyebrow`; `content.compatibilityTest.matches` (Task 3); `PairSummary`.
- Produces: `function MatchesView({ pairs }: { pairs: PairSummary[] })` — a Server Component. **Callers must guarantee `pairs.length > 0`**; the empty case is a different screen entirely (Task 8 routes to it).

- [ ] **Step 1: Write the failing test**

Create `components/compatibility/MatchesView.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchesView } from "./MatchesView";
import { content } from "@/content";
import type { PairSummary } from "@/lib/weftTypes";

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "Looking after your people",
  blurb: "You show up for the people close to you.",
};

const PERSON = {
  name: "Ana",
  top_values: [VALUE],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

function pair(id: string, name: string): PairSummary {
  return {
    pair_id: id,
    headline: `Ana and ${name} both lead with Benevolence.`,
    score: 0.1544,
    band: "A real mix.",
    shared_values: [VALUE],
    difference: "Where you differ most is humour.",
    people: [PERSON, { ...PERSON, name }],
  };
}

const escaped = (s: string) => s.replace(/'/g, "&#x27;");

test("one match reads as one, not as '1 matches'", () => {
  const html = renderToStaticMarkup(<MatchesView pairs={[pair("p1", "Ben")]} />);
  expect(html).toContain(escaped(content.compatibilityTest.matches.countOne));
  expect(html).not.toContain("{count}");
});

test("several matches are counted in the heading", () => {
  const html = renderToStaticMarkup(
    <MatchesView pairs={[pair("p1", "Ben"), pair("p2", "Cal"), pair("p3", "Di")]} />,
  );
  expect(html).toContain("3 people have answered your link.");
  expect(html).not.toContain("{count}");
});

test("every pair gets its own card", () => {
  const html = renderToStaticMarkup(
    <MatchesView pairs={[pair("p1", "Ben"), pair("p2", "Cal")]} />,
  );
  expect(html.match(/class="ctest-match"/g)).toHaveLength(2);
  expect(html).toContain('href="/compatibility-test/pair/p1"');
  expect(html).toContain('href="/compatibility-test/pair/p2"');
});

test("the backend's newest-first order is preserved", () => {
  // The page does not re-sort; if this ever fails, something started to.
  const html = renderToStaticMarkup(
    <MatchesView pairs={[pair("p2", "Cal"), pair("p1", "Ben")]} />,
  );
  expect(html.indexOf("pair/p2")).toBeLessThan(html.indexOf("pair/p1"));
});

test("the heading is the page's only h1", () => {
  const html = renderToStaticMarkup(<MatchesView pairs={[pair("p1", "Ben")]} />);
  expect(html.match(/<h1/g)).toHaveLength(1);
});
```

`toBeLessThan` must exist in `bun-test.d.ts`. Add it beside `toBeGreaterThan` if it is missing:

```ts
    toBeLessThan(expected: number): void;
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test components/compatibility/MatchesView.test.tsx`
Expected: FAIL — `Cannot find module './MatchesView'`.

- [ ] **Step 3: Write `components/compatibility/MatchesView.tsx`**

```tsx
import { content } from "@/content";
import { CtestShell } from "@/components/compatibility/CtestShell";
import { MatchCard } from "@/components/compatibility/MatchCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { PairSummary } from "@/lib/weftTypes";

/**
 * Everyone who has answered this person's link, newest first — the order the
 * backend sent them in, deliberately not re-sorted here.
 *
 * Callers guarantee at least one pair. Nobody-yet is a different screen with
 * a different job (offering a fresh link), not an empty version of this one.
 */
export function MatchesView({ pairs }: { pairs: PairSummary[] }) {
  const copy = content.compatibilityTest.matches;
  const count =
    pairs.length === 1
      ? copy.countOne
      : copy.countMany.replace("{count}", String(pairs.length));

  return (
    <CtestShell align="top">
      <div className="ctest-pair relative z-10">
        <header className="flex flex-col items-center text-center">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1 className="ctest-band">{copy.headline}</h1>
          <p className="ctest-note">{count}</p>
        </header>

        <ul className="ctest-matches">
          {pairs.map((pair) => (
            <MatchCard key={pair.pair_id} pair={pair} />
          ))}
        </ul>
      </div>
    </CtestShell>
  );
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test components/compatibility/MatchesView.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add components/compatibility/MatchesView.tsx components/compatibility/MatchesView.test.tsx bun-test.d.ts
git commit -m "feat: list every match a thread has produced"
```

---

### Task 6: `ReshareLink` — the waiting screen's whole point

**Files:**
- Create: `components/compatibility/ReshareLink.tsx`
- Test: `components/compatibility/ReshareLink.test.tsx`

**Interfaces:**
- Consumes: `POST /api/invite` (Task 2); `ShareLink`; `PremiumButton`; `content.compatibilityTest.matches.waiting` (Task 3).
- Produces: `function ReshareLink()` — a **client** component, no props.

Someone checking back before anyone has answered needs a link to send, and the one they were given may be lost. The button mints a fresh one on demand — **not on render**, because a GET that mints a token would spend one on every refresh.

The same in-flight discipline as `CompatibilityTest.submit()` applies: a ref, not a state flag, because a state update does not land before a second click can arrive.

- [ ] **Step 1: Write the failing test**

Create `components/compatibility/ReshareLink.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReshareLink } from "./ReshareLink";
import { content } from "@/content";

test("it offers the button and no link until one is asked for", () => {
  const html = renderToStaticMarkup(<ReshareLink />);
  expect(html).toContain(`aria-label="${content.compatibilityTest.matches.waiting.cta}"`);
  // No token exists yet, so no link box and no invite path may appear.
  expect(html).not.toContain("ctest-linkbox");
  expect(html).not.toContain("/compatibility-test/invite/");
});

test("nothing is minted just by rendering the page", async () => {
  // A GET that spends a token on every refresh is a slow leak. The token is
  // minted by the click, and only by the click.
  let called = false;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;

  try {
    renderToStaticMarkup(<ReshareLink />);
    // Give any stray effect or microtask a turn to run before asserting.
    await Promise.resolve();
    expect(called).toBe(false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("no error is shown before anything has been tried", () => {
  const html = renderToStaticMarkup(<ReshareLink />);
  expect(html).not.toContain(content.compatibilityTest.matches.waiting.failed);
  expect(html).not.toContain('role="alert"');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test components/compatibility/ReshareLink.test.tsx`
Expected: FAIL — `Cannot find module './ReshareLink'`.

- [ ] **Step 3: Write `components/compatibility/ReshareLink.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { content } from "@/content";
import { ShareLink } from "@/components/compatibility/ShareLink";
import { PremiumButton } from "@/components/ui/PremiumButton";

const TIMEOUT_MS = 8000;

/**
 * A fresh share link, on request.
 *
 * Minted by the click rather than by the render: this page is a GET someone
 * may refresh a dozen times while they wait, and minting on render would spend
 * a token on each one. Invites are cheap, but not free of meaning -- each is a
 * live capability with a thirty-day life.
 *
 * The in-flight guard is a ref, not state: a state update does not land before
 * a second click can arrive, and two clicks would mint two tokens.
 */
export function ReshareLink() {
  const copy = content.compatibilityTest.matches.waiting;
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function mint() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(false);

    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const body = (await response.json().catch(() => null)) as { token?: string } | null;
      if (response.ok && body?.token) setToken(body.token);
      else setFailed(true);
    } catch {
      // Offline, or the request never landed. Nothing was created.
      setFailed(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (token) return <ShareLink token={token} />;

  return (
    <div className="mt-8 flex flex-col items-center">
      <PremiumButton tone="ember" onClick={mint} disabled={busy}>
        {copy.cta}
      </PremiumButton>
      {failed && (
        <p className="ctest-error" role="alert">
          {copy.failed}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test components/compatibility/ReshareLink.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add components/compatibility/ReshareLink.tsx components/compatibility/ReshareLink.test.tsx
git commit -m "feat: hand a waiting originator a fresh link"
```

---

### Task 7: The matches page

**Files:**
- Create: `app/compatibility-test/matches/page.tsx`
- Test: `app/compatibility-test/matches/page.test.tsx`

**Interfaces:**
- Consumes: `readSessionId` (`lib/server/session.ts`); `loadMyPairs` (Task 1); `MatchesView` (Task 5); `ReshareLink` (Task 6); `CompatibilityNotice`; `content.compatibilityTest.matches` (Task 3).
- Produces: the route `/compatibility-test/matches`.

Five screens, from four outcomes:

| `loadMyPairs` says | Screen | CTA |
|---|---|---|
| `no_session` | `matches.none` — you haven't taken this | Take the test → `/compatibility-test` |
| `not_found` | `matches.lost` — your thread is gone | Start again → `/compatibility-test` |
| `unavailable` | `matches.unavailable` | Try again → `/compatibility-test/matches` |
| `ok`, `pairs.length === 0` | `matches.waiting` + `ReshareLink` | (the mint button) |
| `ok`, `pairs.length > 0` | `MatchesView` | (per-card links) |

`CompatibilityNotice` takes a single optional `cta`, and the waiting screen needs an interactive client component instead — so the waiting screen composes `CtestShell` directly rather than bending the notice into a shape it does not have.

- [ ] **Step 1: Write the failing test**

Create `app/compatibility-test/matches/page.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchesScreen, metadata } from "./page";
import { content } from "@/content";
import type { PairSummary } from "@/lib/weftTypes";

const escaped = (s: string) => s.replace(/'/g, "&#x27;");
const copy = content.compatibilityTest.matches;

const VALUE = {
  key: "BE",
  name: "Benevolence",
  tagline: "Looking after your people",
  blurb: "You show up for the people close to you.",
};

const PERSON = {
  name: "Ana",
  top_values: [VALUE],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

const PAIR: PairSummary = {
  pair_id: "pair-1",
  headline: "Ana and Ben both lead with Benevolence.",
  score: 0.1544,
  band: "A real mix.",
  shared_values: [VALUE],
  difference: "Where you differ most is humour.",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

test("this page must never be indexed", () => {
  // It renders whatever the cookie holder's matches are.
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("someone who has never taken it is invited to", () => {
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "no_session" }} />);
  expect(html).toContain(escaped(copy.none.headline));
  expect(html).toContain(`aria-label="${copy.none.cta}"`);
  expect(html).toContain('href="/compatibility-test"');
});

test("a cookie whose session is gone says so, and offers a restart", () => {
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "not_found" }} />);
  expect(html).toContain(escaped(copy.lost.headline));
  expect(html).toContain(`aria-label="${copy.lost.cta}"`);
});

test("an unreachable backend offers a retry, not a restart", () => {
  // Their thread is fine. Sending them back to question one would be a lie.
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "unavailable" }} />);
  expect(html).toContain(escaped(copy.unavailable.headline));
  expect(html).toContain(`aria-label="${copy.unavailable.cta}"`);
  expect(html).toContain('href="/compatibility-test/matches"');
});

test("every dead end offers a way out", () => {
  for (const outcome of [
    { status: "no_session" },
    { status: "not_found" },
    { status: "unavailable" },
  ] as const) {
    const html = renderToStaticMarkup(<MatchesScreen outcome={outcome} />);
    expect(html).toContain("aria-label=");
  }
});

test("nobody has answered yet gets the waiting screen and a mint button", () => {
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "ok", pairs: [] }} />);
  expect(html).toContain(escaped(copy.waiting.headline));
  expect(html).toContain(`aria-label="${copy.waiting.cta}"`);
  // The list heading belongs to the other screen entirely.
  expect(html).not.toContain(escaped(copy.headline));
});

test("at least one match renders the list instead", () => {
  const html = renderToStaticMarkup(<MatchesScreen outcome={{ status: "ok", pairs: [PAIR] }} />);
  expect(html).toContain(escaped(copy.headline));
  expect(html).toContain('href="/compatibility-test/pair/pair-1"');
  expect(html).not.toContain(escaped(copy.waiting.headline));
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test app/compatibility-test/matches/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`.

- [ ] **Step 3: Write `app/compatibility-test/matches/page.tsx`**

`MatchesScreen` is exported separately from the default page so the five branches can be tested without a cookie: `readSessionId()` needs a request context, and `bun test` has none. The same split as `respondWithMint` in Task 2, for the same reason.

```tsx
import type { Metadata } from "next";
import { CompatibilityNotice } from "@/components/compatibility/CompatibilityNotice";
import { CtestShell } from "@/components/compatibility/CtestShell";
import { MatchesView } from "@/components/compatibility/MatchesView";
import { ReshareLink } from "@/components/compatibility/ReshareLink";
import { content } from "@/content";
import { loadMyPairs, type MyPairsOutcome } from "@/lib/server/myPairs";
import { readSessionId } from "@/lib/server/session";

const MATCHES_PATH = "/compatibility-test/matches";
const QUIZ_PATH = "/compatibility-test";

export const metadata: Metadata = {
  title: "Weft: Your threads",
  description: "Everyone who has answered your compatibility link.",
  // Whatever the cookie holder's matches are, complete with both profiles
  // one click away. It must never enter an index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The five screens, split out from the page so each can be rendered in a test
 * without a request context -- `readSessionId()` throws outside one.
 */
export function MatchesScreen({ outcome }: { outcome: MyPairsOutcome }) {
  const copy = content.compatibilityTest.matches;

  if (outcome.status === "no_session") {
    return (
      <CompatibilityNotice
        eyebrow={copy.none.eyebrow}
        headline={copy.none.headline}
        body={copy.none.body}
        cta={{ href: QUIZ_PATH, label: copy.none.cta }}
      />
    );
  }

  if (outcome.status === "not_found") {
    return (
      <CompatibilityNotice
        eyebrow={copy.lost.eyebrow}
        headline={copy.lost.headline}
        body={copy.lost.body}
        cta={{ href: QUIZ_PATH, label: copy.lost.cta }}
      />
    );
  }

  if (outcome.status === "unavailable") {
    return (
      <CompatibilityNotice
        eyebrow={copy.unavailable.eyebrow}
        headline={copy.unavailable.headline}
        body={copy.unavailable.body}
        // Back to this same page: their thread is fine, and sending them to
        // question one would be a lie about what went wrong.
        cta={{ href: MATCHES_PATH, label: copy.unavailable.cta }}
      />
    );
  }

  if (outcome.pairs.length === 0) {
    // Not CompatibilityNotice: the point of this screen is the mint button,
    // and the notice takes a link, not an interactive child.
    return (
      <CtestShell>
        <div className="relative z-10 flex flex-col items-center text-center">
          <span className="ctest-eyebrow">{copy.waiting.eyebrow}</span>
          <h1 className="ctest-prompt">{copy.waiting.headline}</h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-ink/60">
            {copy.waiting.body}
          </p>
          <ReshareLink />
        </div>
      </CtestShell>
    );
  }

  return <MatchesView pairs={outcome.pairs} />;
}

export default async function MatchesPage() {
  const outcome = await loadMyPairs(await readSessionId());

  return (
    <main id="main-content">
      <MatchesScreen outcome={outcome} />
    </main>
  );
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test app/compatibility-test/matches/page.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Check the whole suite, the typecheck and the build**

Run: `bun test && bunx tsc --noEmit && bunx eslint`
Expected: **4 fail and no more** — the four known pre-existing failures. The pass count should be 270 if every test in Tasks 1–7 was written exactly as specified, but treat the failure count as the gate: an implementer who adds a worthwhile extra test should keep it, not delete it to hit a number.

- [ ] **Step 6: Commit**

```bash
git add app/compatibility-test/matches/page.tsx app/compatibility-test/matches/page.test.tsx
git commit -m "feat: let someone come back and see who answered"
```

---

### Task 8: Make the matches page reachable

**Files:**
- Modify: `components/compatibility/ShareScreen.tsx`
- Modify: `components/compatibility/ShareScreen.test.tsx`
- Modify: `components/compatibility/PairResultView.tsx`
- Modify: `components/compatibility/PairResultView.test.tsx`
- Modify: `content.ts` (one key in `share`, one in `pair`)
- Modify: `content.test.ts` (both exact-match blocks)

**Interfaces:**
- Consumes: the route from Task 7.
- Produces: nothing new; two existing screens gain a link.

Nothing currently links to `/compatibility-test/matches`. The share screen already promises "Keep this link. It's also how you come back to see your match" — a promise that, as of Task 7, there is a better way to keep.

- [ ] **Step 1: Write the failing tests**

In `content.test.ts`, add `matchesLink` to the two existing exact-match blocks.

To the `share` block assertion:

```ts
      matchesLink: "See who's answered",
```

To the `pair` block assertion:

```ts
      matchesLink: "See all your threads",
```

Add to `components/compatibility/ShareScreen.test.tsx`:

```tsx
test("the share screen points back to the matches page", () => {
  // The screen promises they can come back. This is where back is.
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-9" onRestart={() => {}} />);
  expect(html).toContain('href="/compatibility-test/matches"');
  expect(html).toContain(
    content.compatibilityTest.share.matchesLink.replace(/'/g, "&#x27;"),
  );
});
```

If `content` is not already imported in that file, add `import { content } from "@/content";`.

Add to `components/compatibility/PairResultView.test.tsx`:

```tsx
test("a result links onward to every other thread this person has", () => {
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken="tok-9" />);
  expect(html).toContain('href="/compatibility-test/matches"');
  expect(html).toContain(content.compatibilityTest.pair.matchesLink);
});

test("the matches link is there even for someone arriving on a forwarded link", () => {
  // It costs nothing: with no session cookie the page invites them to take it.
  const html = renderToStaticMarkup(<PairResultView result={RESULT} shareToken={null} />);
  expect(html).toContain('href="/compatibility-test/matches"');
});
```

If `content` is not already imported in that file, add `import { content } from "@/content";`.

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test content.test.ts components/compatibility/ShareScreen.test.tsx components/compatibility/PairResultView.test.tsx`
Expected: FAIL on all four new assertions (plus the one known pre-existing `content.test.ts` failure).

- [ ] **Step 3: Add the copy**

In `content.ts`, add to `compatibilityTest.share`, after `announce`:

```ts
      matchesLink: "See who's answered",
```

and to `compatibilityTest.pair`, after `restart`:

```ts
      matchesLink: "See all your threads",
```

- [ ] **Step 4: Add the link to `ShareScreen.tsx`**

Add the import:

```tsx
import Link from "next/link";
```

and replace the closing `note` paragraph block with:

```tsx
      <p className="mt-2 max-w-sm font-mono text-[0.68rem] leading-relaxed text-ink/45">
        {copy.note}
      </p>

      <Link
        className="mt-6 font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
        href="/compatibility-test/matches"
      >
        {copy.matchesLink}
      </Link>
```

- [ ] **Step 5: Add the link to `PairResultView.tsx`**

Add the import:

```tsx
import Link from "next/link";
```

Then, inside the final `<section className="flex flex-col items-center text-center">`, after the `shareToken ? … : …` expression and before the section closes, add:

```tsx
          {/* Offered whether or not they hold a token: someone who followed a
              forwarded link has no session, and the page they land on invites
              them to take the test rather than dead-ending. */}
          <Link
            className="mt-8 font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
            href="/compatibility-test/matches"
          >
            {copy.matchesLink}
          </Link>
```

**Careful:** `.ctest-pair > *` drives the staggered entrance by `nth-child`. This link goes *inside* the existing final `<section>`, not beside it — adding a sixth direct child would leave it with no animation delay rule and it would appear at the wrong moment.

- [ ] **Step 6: Run them and watch them pass**

Run: `bun test content.test.ts components/compatibility/ShareScreen.test.tsx components/compatibility/PairResultView.test.tsx`
Expected: PASS, except the one known pre-existing `content.test.ts` failure.

- [ ] **Step 7: Commit**

```bash
git add content.ts content.test.ts components/compatibility/ShareScreen.tsx components/compatibility/ShareScreen.test.tsx components/compatibility/PairResultView.tsx components/compatibility/PairResultView.test.tsx
git commit -m "feat: offer the way back to every thread"
```

---

### Task 9: Consolidate the test-escape helper

**Files:**
- Create: `lib/testEscape.ts`
- Test: `lib/testEscape.test.ts`
- Modify: `components/compatibility/CompatibilityTest.test.tsx`, `app/compatibility-test/invite/[token]/page.test.tsx`, `app/compatibility-test/pair/[id]/page.test.tsx`, `components/compatibility/MatchesView.test.tsx`, `app/compatibility-test/matches/page.test.tsx` — whichever of these define a local `escaped`

**Interfaces:**
- Produces: `function escapeApostrophes(text: string): string`

Closes two carried Phase 3 minors at once: `escaped` was duplicated rather than shared, and its general name hid that it only handles apostrophes — so the first person to reuse it on copy containing `&` would get a silently-passing test that asserts the wrong string.

- [ ] **Step 1: Find every copy**

Run: `grep -rn "const escaped" --include="*.tsx" --include="*.ts" . | grep -v node_modules`

Expected: the definitions in `app/compatibility-test/invite/[token]/page.test.tsx` and `app/compatibility-test/pair/[id]/page.test.tsx`, plus any added by Tasks 5 and 7 of this plan. Record the exact list before editing.

- [ ] **Step 2: Write the failing test**

Create `lib/testEscape.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { escapeApostrophes } from "./testEscape";

describe("escapeApostrophes", () => {
  test("escapes apostrophes the way renderToStaticMarkup does", () => {
    expect(escapeApostrophes("We can't find that.")).toBe("We can&#x27;t find that.");
  });

  test("escapes every apostrophe, not just the first", () => {
    expect(escapeApostrophes("don't, can't")).toBe("don&#x27;t, can&#x27;t");
  });

  test("leaves text with none of them alone", () => {
    expect(escapeApostrophes("Your compatibility")).toBe("Your compatibility");
  });

  test("throws on an ampersand rather than under-escaping it", () => {
    // The name says apostrophes. React also escapes & and <, and a helper
    // that quietly ignored them would make a wrong assertion pass.
    expect(() => escapeApostrophes("salt & pepper")).toThrow();
    expect(() => escapeApostrophes("a < b")).toThrow();
  });
});
```

`toThrow` must exist in `bun-test.d.ts`. Add it if missing:

```ts
    toThrow(expected?: unknown): void;
```

- [ ] **Step 3: Run it and watch it fail**

Run: `bun test lib/testEscape.test.ts`
Expected: FAIL — `Cannot find module './testEscape'`.

- [ ] **Step 4: Write `lib/testEscape.ts`**

```ts
/**
 * `renderToStaticMarkup` escapes apostrophes to `&#x27;`, so a test comparing
 * against copy from content.ts has to escape it the same way.
 *
 * Test-only, and deliberately loud about its limits: React also escapes `&`
 * and `<`, and a helper that silently passed those through would turn a wrong
 * assertion into a passing one. If copy ever needs them, widen this function
 * -- do not widen the input.
 */
export function escapeApostrophes(text: string): string {
  if (/[&<]/.test(text)) {
    throw new Error(
      `escapeApostrophes only handles apostrophes, and this text contains & or <: ${text}`,
    );
  }
  return text.replace(/'/g, "&#x27;");
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `bun test lib/testEscape.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Replace every local copy**

In each file found in Step 1: delete the local `const escaped = …` and add

```ts
import { escapeApostrophes } from "@/lib/testEscape";
```

then rename the call sites `escaped(` → `escapeApostrophes(`.

- [ ] **Step 7: Confirm the change was a no-op for behaviour**

Run: `bun test && grep -rn "const escaped" --include="*.tsx" --include="*.ts" . | grep -v node_modules`
Expected: same pass/fail counts as before this task; the grep returns nothing.

If a test now *throws* rather than fails, that is the ampersand guard doing its job: the assertion it guarded was comparing against text React would have escaped differently. Fix the assertion, do not weaken the helper.

- [ ] **Step 8: Commit**

```bash
git add lib/testEscape.ts lib/testEscape.test.ts bun-test.d.ts
git add -u
git commit -m "refactor: share one honestly-named escape helper across the tests"
```

---

### Task 10: Harden the submit path

**Files:**
- Modify: `lib/submitOutcome.ts`
- Modify: `lib/submitOutcome.test.ts`
- Modify: `components/compatibility/CompatibilityTest.tsx`
- Modify: `content.ts` (`details.stranded`)
- Modify: `content.test.ts`

**Interfaces:**
- Produces: `SubmitDecision` gains `{ phase: "stranded"; pairId: string; shareToken: string }`.

Two carried minors, both on the one path in the flow that writes:

1. **The client fetch has no timeout** (carried from Phase 2). `weftFetch` gives the *server* an 8s `AbortSignal.timeout`, but the browser's POST to `/api/answers` has none. A hung connection leaves the loader spinning with no end.
2. **The pair branch releases the in-flight guard on a throw** (carried from Phase 3, Task 6). If `window.location.assign` throws, the pair *already exists upstream* — the POST succeeded. Releasing the guard invites a retry that would create a second session and a second pair. The correct handling is a terminal, non-retryable state that hands over the link instead.

- [ ] **Step 1: Write the failing decision test**

Add to `lib/submitOutcome.test.ts`:

```ts
test("a pair that cannot be navigated to is stranded, not retryable", () => {
  // The POST already succeeded and the pair exists. Offering "try again"
  // would mint a second session and a second pair for the same person.
  expect(strandedOutcome({ phase: "pair", pairId: "p1", shareToken: "tok-9" })).toEqual({
    phase: "stranded",
    pairId: "p1",
    shareToken: "tok-9",
  });
});
```

and to `content.test.ts`, inside the `details` exact-match block:

```ts
      stranded: "Your result is ready, but we couldn't open it. Use the link below.",
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test lib/submitOutcome.test.ts content.test.ts`
Expected: FAIL — `strandedOutcome` is not exported; `details.stranded` is undefined.

- [ ] **Step 3: Widen `lib/submitOutcome.ts`**

Add the variant to the union:

```ts
export type SubmitDecision =
  | { phase: "share"; token: string }
  | { phase: "pair"; pairId: string; shareToken: string }
  | { phase: "stranded"; pairId: string; shareToken: string }
  | { phase: "details"; error: string };
```

and append:

```ts
/**
 * The pair exists upstream but the browser could not get to its page.
 *
 * Deliberately not an error the visitor can retry: the POST succeeded, so a
 * second attempt would create a second session and a second pair for the same
 * person. This is a terminal state that hands over the destination instead.
 */
export function strandedOutcome(
  decision: Extract<SubmitDecision, { phase: "pair" }>,
): Extract<SubmitDecision, { phase: "stranded" }> {
  return { phase: "stranded", pairId: decision.pairId, shareToken: decision.shareToken };
}
```

- [ ] **Step 4: Add the copy to `content.ts`**

In `compatibilityTest.details`, after `incomplete`:

```ts
      stranded: "Your result is ready, but we couldn't open it. Use the link below.",
```

- [ ] **Step 5: Run them and watch them pass**

Run: `bun test lib/submitOutcome.test.ts content.test.ts`
Expected: PASS, except the one known pre-existing `content.test.ts` failure.

- [ ] **Step 6: Add the timeout and the stranded state to `CompatibilityTest.tsx`**

Add near `AUTO_ADVANCE_MS`:

```tsx
/**
 * The browser's own ceiling on the one request that writes. `weftFetch` gives
 * the server 8s; without this the browser would wait indefinitely on a hung
 * connection, with the loader spinning and no way out.
 *
 * Comfortably longer than the server's timeout, so a slow-but-alive backend
 * produces the server's clean error rather than this one's blank failure.
 */
const SUBMIT_TIMEOUT_MS = 15000;
```

Add the signal to the fetch call:

```tsx
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
        body: JSON.stringify({
```

Add the state, beside the other `useState` calls:

```tsx
  const [stranded, setStranded] = useState<{ pairId: string; shareToken: string } | null>(null);
```

Replace the `outcome.phase === "pair"` block with:

```tsx
      if (outcome.phase === "pair") {
        // A full navigation: the pair page is force-dynamic SSR, so this
        // fetches the rendered result rather than transitioning into a page
        // that would have to fetch anyway. The loader stays up until it lands.
        try {
          window.location.assign(pairHref(outcome.pairId, outcome.shareToken));
          leaving = true;
        } catch {
          // The pair already exists upstream -- the POST succeeded. Retrying
          // would create a second one, so this is terminal: show the result's
          // address rather than a button that would do damage.
          const dead = strandedOutcome(outcome);
          setStranded({ pairId: dead.pairId, shareToken: dead.shareToken });
          setPhase("stranded");
          leaving = true;
        }
        return;
      }
```

Import `strandedOutcome` alongside `decideSubmitOutcome`.

**`leaving = true` in both arms is deliberate:** the guard must stay engaged either way. Navigation succeeded, or the pair exists and must never be re-created.

Add `"stranded"` to the `Phase` union in `lib/compatibility.ts`:

```ts
export type Phase = "intro" | "quiz" | "details" | "submitting" | "share" | "stranded";
```

and render it, after the `phase === "share"` block:

```tsx
        {phase === "stranded" && stranded && (
          <motion.div key="stranded" {...fade} transition={transition} className="relative z-10 w-full">
            <div className="flex w-full flex-col items-center text-center">
              {/* Their result exists -- that is the fact to lead with. The
                  share eyebrow ("Your link is ready") would be a lie here. */}
              <span className="ctest-eyebrow">{data.pair.eyebrow}</span>
              <p className="ctest-error" role="alert">
                {data.details.stranded}
              </p>
              {/* A real anchor, not just the text: assign() failed, but an
                  ordinary link click is a different code path and may work. */}
              <a className="ctest-linkbox mt-7" href={pairHref(stranded.pairId, stranded.shareToken)}>
                {pairHref(stranded.pairId, stranded.shareToken)}
              </a>
            </div>
          </motion.div>
        )}
```

Add `setStranded(null);` to `reset()`.

- [ ] **Step 7: Confirm the suite, the typecheck and the lint**

Run: `bun test && bunx tsc --noEmit && bunx eslint`
Expected: no new failures; tsc silent; eslint 0 errors.

If `tsc` complains that `Phase` is not exhaustively handled somewhere, fix the switch rather than widening a type — the new variant is the point.

- [ ] **Step 8: Commit**

```bash
git add lib/submitOutcome.ts lib/submitOutcome.test.ts lib/compatibility.ts components/compatibility/CompatibilityTest.tsx content.ts content.test.ts
git commit -m "fix: bound the submit request, and stop offering a retry that would double-write"
```

---

### Task 11: Clear the carried debt

**Files:**
- Modify: `lib/compatibility.ts`, `lib/compatibility.test.ts` (the rename)
- Modify: `components/compatibility/CompatibilityTest.tsx`, `components/compatibility/CompatibilityTest.test.tsx` (the three inline strings)
- Modify: `content.ts`, `content.test.ts` (their new home)
- Modify: `app/globals.css` (four dead rule sets)
- Modify: `components/compatibility/ShareScreen.test.tsx` (one assertion the deletion invalidates)
- Modify: `app/compatibility-test/pair/[id]/page.tsx` (exhaustiveness)
- Modify: `components/compatibility/PairResultView.test.tsx` (one missing case)

Every remaining "Minor (open, for final review)" from `.superpowers/sdd/progress.md`, closed in one pass.

- [ ] **Step 1: Write the failing tests**

Add to `content.test.ts`, inside the `compatibilityTest` block:

```ts
  test("the quiz chrome reads from content, not from the component", () => {
    expect(content.compatibilityTest.quiz).toEqual({
      // {n} and {total} are filled in by CompatibilityTest.
      progress: "Question {n} of {total}",
      back: "Back",
      next: "Next",
    });
  });
```

Add to `components/compatibility/CompatibilityTest.test.tsx`:

```tsx
test("the question counter is built from content, with both numbers filled in", () => {
  const html = renderToStaticMarkup(<CompatibilityTest questions={QUESTIONS} />);
  // The intro renders first, so drive to the quiz the way the other tests do.
  expect(content.compatibilityTest.quiz.progress).toContain("{n}");
  expect(content.compatibilityTest.quiz.progress).toContain("{total}");
  // Nothing may ship with an unfilled placeholder.
  expect(html).not.toContain("{n}");
  expect(html).not.toContain("{total}");
});
```

Add to `components/compatibility/PairResultView.test.tsx`:

```tsx
test("a person with nothing measurable renders no empty definition list", () => {
  // An empty <dl> is invalid and shows as a gap the reader cannot explain.
  const blank = {
    ...RESULT.people[0],
    humour: "—",
    opens_up: "",
    pace: "unspecified",
    life_stage: "—",
  };
  const html = renderToStaticMarkup(
    <PairResultView result={{ ...RESULT, people: [blank, RESULT.people[1]] }} shareToken={null} />,
  );
  expect(html).not.toContain("<dl");
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test content.test.ts components/compatibility/CompatibilityTest.test.tsx components/compatibility/PairResultView.test.tsx`
Expected: FAIL on the two new content-driven assertions. The `<dl>` test may already pass — `personTraits` filters unmeasured traits — in which case it is a regression guard for behaviour that was never covered. Note that in the report; do not delete it.

- [ ] **Step 3: Add the quiz chrome to `content.ts`**

In `compatibilityTest`, after `helpers`:

```ts
    quiz: {
      // {n} and {total} are filled in by CompatibilityTest.
      progress: "Question {n} of {total}",
      back: "Back",
      next: "Next",
    },
```

- [ ] **Step 4: Read them in `CompatibilityTest.tsx`**

Replace the hardcoded eyebrow:

```tsx
            <span className="ctest-eyebrow">
              {data.quiz.progress
                .replace("{n}", String(activeIndex + 1))
                .replace("{total}", String(questions.length))}
            </span>
```

Replace `&larr; Back` with:

```tsx
                &larr; {data.quiz.back}
```

Replace the bare `Next` inside the `PremiumButton` with `{data.quiz.next}`.

- [ ] **Step 5: Rename `ANALYZING_MS`**

In `lib/compatibility.ts`:

```ts
/**
 * How long the loader's phrases take to cycle once. Named for what it drives:
 * there is no "analyzing" phase any more, and the old name outlived it.
 */
export const LOADER_CYCLE_MS = 4400;
```

Update `lib/compatibility.test.ts` and the import and use in `CompatibilityTest.tsx`.

Run `grep -rn "ANALYZING_MS" --include="*.ts" --include="*.tsx" . | grep -v node_modules` and confirm it returns nothing.

- [ ] **Step 6: Delete the dead CSS**

From `app/globals.css`, delete these four rule sets. Confirm each is unreferenced first — run `grep -rn "<class>" --include="*.tsx" . | grep -v node_modules` for each and expect no component hits.

- `.ctest-meter` and `.ctest-meter-fill` — replaced by `.ctest-gauge-*`
- `.ctest-share`, `.ctest-share:hover`, `.ctest-share:active`, `.ctest-share:focus-visible`, **and the `.ctest-share` rule inside the `@media (min-width: 480px)` block near line 1309** — `ShareLink` uses `PremiumButton`
- `.ctest-option-hint` — never referenced
- `.ctest-chip` — `PairResultView` now uses `.ctest-band`

**Do not delete `.ctest-copied`**, which sits between two of these and is live in `ShareLink`.

`components/compatibility/ShareScreen.test.tsx` asserts `expect(html).not.toContain("ctest-meter")`. Once the class is gone that assertion can never fail. Replace it with one that still can:

```tsx
test("the share screen shows no score, because there is nothing to score yet", () => {
  const html = renderToStaticMarkup(<ShareScreen shareToken="tok-9" onRestart={() => {}} />);
  // One person is not a compatibility. Nothing numeric belongs here.
  expect(html).not.toContain("ctest-gauge");
  expect(html).not.toMatch(/\d+%/);
});
```

`toMatch` must exist in `bun-test.d.ts`. Add it if missing:

```ts
    toMatch(expected: RegExp | string): void;
```

- [ ] **Step 7: Add the exhaustiveness check to the pair page**

In `app/compatibility-test/pair/[id]/page.tsx`, the notice copy is picked by a ternary that silently treats an unknown status as `unavailable`. Replace it with a switch that cannot:

```tsx
  if (outcome.status !== "ok") {
    const notice = pickNotice(outcome.status);
```

and add above the component:

```tsx
/**
 * A switch rather than a ternary so a fourth PairOutcome status becomes a
 * type error here instead of silently rendering "we couldn't reach the
 * service" at someone whose problem is something else.
 */
function pickNotice(status: "not_found" | "unavailable") {
  const copy = content.compatibilityTest.pair;
  switch (status) {
    case "not_found":
      return copy.missing;
    case "unavailable":
      return copy.unavailable;
    default: {
      const never: never = status;
      throw new Error(`unhandled pair status: ${String(never)}`);
    }
  }
}
```

- [ ] **Step 8: Run everything**

Run: `bun test && bunx tsc --noEmit && bunx eslint && bun run build`
Expected: no new failures; tsc silent; eslint 0 errors; the build succeeds and lists `/compatibility-test/matches` as dynamic.

- [ ] **Step 9: Commit**

```bash
git add -u
git commit -m "chore: clear the debt the first three phases carried"
```

---

### Task 12: The live round trip, in a real browser

**Files:** none. This task writes no code; it produces the report the exit gate needs.

This is the task Phase 3 could not finish. Two things have never been verified against anything but a code reading: the by-eye walkthrough, and the **double-submit guard**, which has never actually run.

**If the Chrome extension is unavailable again, stop and report that rather than marking the task done.** A guard verified by reading is a guard that has not been verified.

- [ ] **Step 1: Start both services**

```bash
# terminal 1 -- weft_core, in-memory, no database
cd /Users/shearytan/documents/surnx/weft_core && uvicorn weft.api:app --reload --port 8000

# terminal 2 -- next dev
cd /Users/shearytan/Documents/SurnX/web-frontend && bun run dev
```

Confirm `.env.local` holds `WEFT_API_URL=http://localhost:8000` and a dev `WEFT_PROXY_KEY` matching the backend's.

- [ ] **Step 2: Confirm the questions come from the live backend, not the snapshot**

```bash
curl -sD - -o /dev/null http://localhost:3000/api/bank | grep -i x-weft-bank-source
```

Expected: `x-weft-bank-source: live`. If it says `fallback`, the backend is not reachable and nothing below proves anything.

- [ ] **Step 3: Originator round trip, in the browser**

Open `http://localhost:3000/compatibility-test`. Answer all twenty. At the details form:

**Double-click the submit button as fast as you can.** Then check the backend log and count `POST /api/answers` entries.

Expected: **exactly one.** This is the assertion Phase 3 owed. If there are two, the guard does not work and the phase does not pass.

Record the share link.

- [ ] **Step 4: Visit matches with one session and no answers yet**

Open `http://localhost:3000/compatibility-test/matches` in the same browser profile.

Expected: the waiting screen. **Double-click Get a fresh link** as fast as you can.

Expected: exactly **one** `POST /api/invite` in the backend log, and one link box. The button is replaced by the link on success, so a second click has nothing to hit — but the in-flight ref is what must stop two clicks landing before the first response does.

Reload and mint again: a *second* `POST /api/invite` is correct here. Invites are not single-use and minting another is supported. What must not happen is a mint on plain page load — reload the waiting screen without clicking and confirm the log stays quiet.

- [ ] **Step 5: Responder round trip**

Open the share link in a **different browser profile or a private window** — a separate cookie jar is what makes this a second person.

Answer, submit, and confirm the pair page renders: percentage, gauge, band, both names, both profiles, and the responder's own invite link.

- [ ] **Step 6: The originator returns**

Back in the first profile, reload `/compatibility-test/matches`.

Expected: the list, one card, both names in the headline, the same percentage the pair page showed. Follow the card's link and confirm it opens that pair — **and that the URL carries no `?share=`**.

- [ ] **Step 7: The dead ends**

- `/compatibility-test/matches` in a **third** clean profile → "You haven't taken this yet" + Take the test.
- Stop the backend, reload `/compatibility-test/matches` in the first profile → "We couldn't reach the service" + a **Try again** that returns here, not to question one.
- Restart the backend (its in-memory store is now empty, so the cookie's session is gone) and reload → "We've lost track of your thread" + Start again.

- [ ] **Step 8: Confirm no secret and no session id reached the browser**

```bash
grep -rn "WEFT_API_URL\|WEFT_PROXY_KEY" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v "\.test\."
```

Expected: `lib/server/weftApi.ts` only.

In the browser devtools, on `/compatibility-test/matches` with a session: confirm `weft_session` is `HttpOnly`, and that View Source contains no session id.

- [ ] **Step 9: The full gate**

```bash
bun test ; bunx tsc --noEmit ; bunx eslint ; bun run build
```

Record the exact numbers. Expected: 4 failures and no more (the known pre-existing four); tsc silent; eslint 0 errors; build succeeds.

- [ ] **Step 10: Write the report**

Append a Phase 4 section to `.superpowers/sdd/progress.md` in the format the earlier phases use, and **stop**. Do not begin any further work.

---

## Exit gate

Per the spec (line 271) and the standing instruction that each phase stops for approval:

**Implementation stops here.** The report must state, with evidence:

1. A returning originator sees their matches after the friend finishes — verified in a browser, not only headless.
2. The double-submit guard was exercised by a real double-click and produced exactly one `POST /api/answers`. *(Owed since Phase 3.)*
3. All five matches screens render, and each dead end offers a way out that matches what actually went wrong.
4. Full suite green apart from the four known pre-existing failures; tsc, eslint and build clean.
5. The spec-deviation from the route map (`GET /api/my/pairs` not built; `POST /api/invite` built) confirmed by the reviewer.
6. Every carried minor from `.superpowers/sdd/progress.md` either closed or explicitly restated as deliberate.

Then wait.
