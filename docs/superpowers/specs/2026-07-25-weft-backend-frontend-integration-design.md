# Weft — Backend ↔ Frontend Integration Design

**Date:** 2026-07-25
**Repos:** `web-frontend` (Next.js 16, this repo) and `weft_core` (FastAPI, at
`/Users/shearytan/documents/surnx/weft_core`)
**Status:** Design approved; ready for implementation planning.

**Both repos are in scope for this effort.** The backend contract changes
(Phase 0) are implemented here alongside the frontend phases, not deferred to
separate work. Each repo is committed on its own branch.

## Goal

Connect the static `web-frontend` compatibility test to the live `weft_core`
scoring backend so two people can measure their compatibility end to end:
one person answers, shares a link, a friend answers, and both see the shared
result. Build the **full flow** (questions → answers → invite → pair result),
following industry-standard practice for a Next.js frontend + separate API.

## Core principle (drives the whole flow)

**A profile is only ever shown as part of a two-person compatibility result —
never as a solo end-of-quiz screen.** Finishing the quiz alone earns a share
link, nothing more. Profiles (and compatibility) only exist once two people
have answered. The backend's `own_read` solo view is therefore removed from the
finish flow entirely; per-person profiles are surfaced only inside `pair_result`.

## Architecture: BFF (Backend-for-Frontend) proxy

The browser only ever talks to its own origin. All FastAPI traffic is
server-to-server from the Next.js runtime.

```
Browser (weft-web on Vercel)
   │  same-origin fetch: /api/bank, /api/answers, /api/pair/[id], /api/my/pairs …
   ▼
Next.js Route Handlers  ── the BFF ──  app/api/*/route.ts   (server-only)
   │  server-to-server HTTPS; sends WEFT_PROXY_KEY header; no CORS
   ▼
FastAPI (weft_core on Render/Railway/Fly) ──► Neon Postgres (WEFT_STORAGE=postgres)
```

**Why BFF:** no CORS surface, backend URL/secrets hidden, single origin, one
place for auth/caching/rate-limiting, and SSR-friendly for share previews.

### Environment variables (all server-only — never `NEXT_PUBLIC`)

| Var | Where | Purpose |
|---|---|---|
| `WEFT_API_URL` | Vercel (Next.js) | FastAPI base URL, e.g. `https://weft-core.onrender.com` |
| `WEFT_PROXY_KEY` | Vercel **and** FastAPI | Shared secret header; FastAPI rejects calls that lack it |
| `WEFT_STORAGE=postgres`, `DATABASE_URL` | FastAPI | Neon Postgres |
| `WEFT_ALLOWED_ORIGINS` | FastAPI | **Empty** — with the BFF, no browser hits FastAPI directly, so CORS stays closed |

### Local development

Both repos run side by side: FastAPI on `uvicorn weft.api:app --reload`
(port 8000, in-memory storage, no database), and Next.js on `next dev` with
`.env.local` holding `WEFT_API_URL=http://localhost:8000` and a dev
`WEFT_PROXY_KEY`. `.env.local` is git-ignored; `.env.example` documents the
variables. The cookie's `Secure` flag is set only outside development, or the
cookie is silently dropped over plain-HTTP localhost.

### Identity (no login in weft_core)

On answer submission the proxy sets an **httpOnly, Secure, `SameSite=Lax`
cookie `weft_session`** holding the new `session_id`, with **`maxAge` = 30 days**
(matching `WEFT_INVITE_TTL_DAYS`). JS can't read it; it is sent automatically.
This keeps the raw `session_id` out of every client-visible URL — only
disposable, expiring invite tokens ever appear in links.

`maxAge` is required, not optional: without it the cookie is a session cookie,
destroyed when the browser closes, and an originator could never return to see
their matches.

**Accepted limitations of having no login** (documented so they are chosen, not
discovered):
- **Identity is per-browser.** An originator on a different device or after
  clearing cookies cannot reach their matches. Mitigation: the share link
  screen tells them to keep their link, and the same token also returns them
  to their result.
- **Pair and invite URLs are capabilities.** Anyone holding a `pair_id` can read
  that pair's result; anyone holding an invite token can answer as the friend.
  This is deliberate — unguessable random ids are what make sharing work without
  accounts — but it means a leaked URL exposes both people's profiles. No
  membership check is enforced on `GET /api/pair/{id}`.

## The three "finish" states

| Who finishes | Pair exists? | Lands on |
|---|---|---|
| **Originator** (started it, not invited) | No | **Only the share link.** No profile, no result |
| **Responder** (arrived via invite link) | Yes — pairing happens on their submit | **Compatibility result + both profiles** |
| **Originator returns** later | Yes — once responder finished | Same **compatibility result + both profiles** (via their matches page) |

## Details capture (name, email, phone)

The backend requires all three (`SessionIn`; blanks are rejected with 400) and
`pair_result` builds its headline from names. The quiz currently collects none
of them, so a details step is **required** for any submission to succeed.

**Placement: after the questions, before the reward.**
```
Intro → Q1…Q20 → [ your details ] → share link (originator)
                                   → pair result (responder)
```
Answering first and asking second maximises completion: the form arrives once
the user has already invested effort, and it gates the thing they want. The
trade-off accepted: answers are lost if they abandon at the form (nothing is
persisted until submit, since the single `POST /api/answers` creates the
session).

This is a new phase in the client state machine — `Phase` gains `"details"`
between `"quiz"` and the terminal states. Validation is client-side (required,
basic email shape) plus the backend's own 400s surfaced inline.

## Backend changes required in `weft_core` (separate repo)

These alter the FastAPI API surface and are coordinated backend work:

1. **Unified answer endpoint.** Collapse `POST /api/session` and
   `POST /api/invite/{token}/answer` into a single action differentiated by an
   attribute. Named after its input (`answers`) because both branches submit
   answers while creating different things, and because "session" is already
   taken by the `weft_session` identity cookie:
   ```
   POST /api/answers
   body: { name, email, phone, answers, invite_token?: string }

     invite_token ABSENT  → originator: create session, mint share link
                            → 200 { role: "originator", share_token }
     invite_token PRESENT → responder: validate answers vs the sender's
                            question_set, create session + pair
                            → 200 { role: "responder", pair_id, share_token }
   ```
   Same validation core; the presence of `invite_token` selects the scenario
   and shapes the response. **Both branches return a `share_token`** — a
   responder must be able to invite others too, or the referral chain dies at
   depth one.
2. **Drop `own_read` from responses.** The solo profile is no longer returned on
   submit (it is not shown anywhere in the new flow).
3. **Enrich `pair_result` per-person profile to the "fuller read"** — for both
   people: `name`, `top_values`, `humour`, `opens_up`, `pace`, `life_stage`.
   Still friend-safe: **no raw scores, no raw answers**.
4. **`GET /api/invite/{token}` returns the full question content**, not just ids.
   It currently returns `{from_name, question_set}`, where `question_set` is a
   list of question ids with no prompts or options — not enough for the
   responder to render the quiz. Return `public_bank(sess.question_set)` as
   well, so the responder renders exactly the sender's questions and cannot
   drift if the bank changes between the two submissions:
   `{ from_name, question_set, questions: [...] }`.
5. **Proxy-secret auth + closed CORS.** Require the `WEFT_PROXY_KEY` header on
   the API; set `WEFT_ALLOWED_ORIGINS` empty.

Endpoints that stay as-is: `GET /api/bank`, `POST /api/invite` (mint extra
links), `GET /api/pair/{id}`, `GET /api/session/{id}/pairs`.

## Frontend: BFF route map

Each Route Handler is a thin, typed proxy; the browser calls only these.

| Same-origin route | Method | Proxies to | Notes |
|---|---|---|---|
| `/api/bank` | GET | `GET /api/bank` | Cacheable (revalidate ~1h). Static JSON is the offline fallback |
| `/api/answers` | POST | `POST /api/answers` | Sets `weft_session` cookie. Returns `{role, share_token}` or `{role, pair_id}` |
| `/api/invite` | POST | `POST /api/invite` | Reads cookie → mints another share link for the current session |
| `/api/invite/[token]` | GET | `GET /api/invite/{token}` | Friend landing: `from_name` + the sender's full questions. Maps 410 → "expired" |
| `/api/pair/[id]` | GET | `GET /api/pair/{id}` | Friend-safe result + both fuller profiles |
| `/api/my/pairs` | GET | `GET /api/session/{id}/pairs` | Reads `session_id` from the cookie — never in a client URL |

**Shared server helpers:**
- `lib/server/weftApi.ts` — the only module that knows `WEFT_API_URL`; adds the
  proxy-key header, an 8s `AbortController` timeout, and maps upstream status →
  clean client responses (never leaks internal errors/URLs).
- `lib/server/session.ts` — reads/sets the `weft_session` cookie.

## Frontend: pages & rendering

| Route | Rendering | Behaviour |
|---|---|---|
| `/compatibility-test` | Server page fetches `/api/bank` → passes questions to client `CompatibilityTest`; **falls back to static `compatibility-questions.json`** if backend is down | Take quiz → details form → POST `/api/answers` (no token) → **share-link screen only** |
| `/compatibility-test/invite/[token]` | SSR (fetch invite data) | Friend landing "*{name} invited you*" → the sender's exact questions (returned by the invite endpoint) → details form → POST `/api/answers` (with token) → redirect to pair result |
| `/compatibility-test/pair/[id]` | SSR (fetch pair data) | Compatibility result + both fuller profiles. SSR for OG/share-preview meta |
| `/compatibility-test/matches` | Server page reads cookie → `/api/my/pairs` | Returning originator's matches. If 0 pairs → "waiting" + reshare link; if ≥1 → pair result(s) |

**Share URL ownership:** the frontend builds links from the returned
`share_token` → `https://<frontend>/compatibility-test/invite/<token>`. The
backend's placeholder `result.shareUrl` is ignored.

## Data translation — answer format

The UI keys answers by option id (`"Q9-0"`); the backend wants indices, exactly
two for `pick2`:
```
UI answers:            { "Q1": ["Q1-2"], "Q9": ["Q9-0","Q9-3"] }
                                   │ strip "<qid>-" prefix → integer index
backend body.answers:  { "Q1": 2,        "Q9": [0, 3] }   // single: int, pick2: [int,int]
```
One pure, tested function `lib/answers.ts` — `toBackendAnswers(uiAnswers, questions)`.

## Error handling

- Proxy maps upstream status → intent: `400` validation → inline message;
  `404`/`410` invite → dedicated "expired / not found" screen; `5xx`/timeout →
  generic "can't reach the service, retry."
- Submit is **double-submit guarded** (in-flight disables the button) — the POST
  creates a session/pair, so idempotency matters.
- Backend unreachable → quiz still renders from static JSON; submit shows a
  soft-fail state, never a crash.

## Testing

- Pure units: `lib/answers.ts` (option-id → index, incl. `pick2` exactly-2), the
  upstream-error mapping in `weftApi.ts`, and details-form validation.
- State machine: the new `"details"` phase — quiz → details → terminal, and
  Back out of details returns to the last question with answers intact.
- Route handlers against a **mocked upstream** (stubbed FastAPI): assert cookie
  set (with `maxAge`) on `/api/answers`, cookie read on `/api/my/pairs`, status
  mapping, originator vs responder response shapes.
- Keep existing static-fallback and `lib/compatibility.ts` tests green.

## Out of scope (YAGNI for now)

The "your friend finished" email (backend not built), analytics,
rate-limiting/retries-with-backoff, real percentile calibration.

## Phased implementation roadmap (exit gate per phase)

Each phase ends at an **exit gate**: implementation stops, results are reported,
and work does **not** continue to the next phase until explicitly approved.

- **Phase 0 — Backend contract in `weft_core`** (in this same effort; sibling repo).
  Unified `POST /api/answers` with optional `invite_token`, returning
  `share_token` on **both** branches; drop `own_read` from responses; enrich
  `pair_result` to the fuller read; `GET /api/invite/{token}` returns full
  question content; proxy-key auth + closed CORS. This is a **breaking change**
  to the existing contract, so `tests/test_api.py` is rewritten, not just
  extended.
  **Exit gate:** backend suite green; both branches of `POST /api/answers`
  (with and without `invite_token`) verified via TestClient; invite endpoint
  confirmed to return renderable questions; README endpoint table updated.
  Report, then stop.

- **Phase 1 — Frontend BFF foundation.**
  `lib/server/weftApi.ts`, `lib/server/session.ts`, `lib/weftTypes.ts`,
  `lib/answers.ts` (+ tests). No pages wired yet.
  **Exit gate:** unit tests pass (answer adapter, error mapping); helpers
  typecheck. Report, then stop.

- **Phase 2 — Bank + details step + originator path.**
  `/api/bank` route (with static fallback); `/api/answers` route (originator
  branch, sets the 30-day cookie); the new `"details"` phase in the client state
  machine (name/email/phone form + validation); `/compatibility-test` fetches
  live questions and ends on the **share-link-only** screen.
  **Exit gate:** originator can complete quiz → details → working share link;
  offline fallback verified; details validation covered by tests; route tests
  pass. Report, then stop.

- **Phase 3 — Responder path + pair result.**
  `/api/invite/[token]` + `/api/pair/[id]` routes; `/compatibility-test/invite/[token]`
  landing + quiz rendered from the invite's own questions; `/answers` responder
  branch; `/compatibility-test/pair/[id]` SSR result with both fuller profiles
  and a "share yours too" link built from the responder's `share_token`.
  **Exit gate:** a full two-person round-trip produces a pair result; expired-token
  screen works; responder can share onward; tests pass. Report, then stop.

- **Phase 4 — Originator return (matches) + hardening.**
  `/api/my/pairs` route; `/compatibility-test/matches`; double-submit guards;
  error screens; copy fixes ("three questions" → 20).
  **Exit gate:** returning originator sees results after the friend finishes;
  end-to-end manual pass; full suite green. Report, then stop.
