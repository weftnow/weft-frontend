# Automatic Group Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continue a completed attendee questionnaire into automatic matching wait, synchronized countdown, enriched group reveal, confirmation, and the existing guided conversation.

**Architecture:** FastAPI remains authoritative for matching, reveal time, profile data, confirmation, and icebreaker state. Next.js uses form-token-scoped BFF routes that resolve the existing HttpOnly attendee cookie through the backend resume endpoint; the browser receives group and conversation state but never the attendee token. Automatic reveal calls the existing idempotent reveal service behind a default-on backend setting, preserving manual reveal when disabled.

**Tech Stack:** Python 3.12, FastAPI, Pydantic, SQLAlchemy async, pytest, Ruff; Next.js 16.2.11 App Router, React 19, TypeScript, Zod 4, TanStack Query 5, Motion 12, CSS Modules, Bun test.

## Global Constraints

- Work in both sibling repositories: frontend `/Users/antoniopertuz/Documents/surnx/weft-web` and backend `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend`.
- Read relevant Next.js 16 guidance in `node_modules/next/dist/docs/` before changing App Router pages, Route Handlers, or data fetching.
- Prefix every shell command with `rtk`; run backend and frontend commands from their respective repository roots.
- Follow strict red-green-refactor: each production behavior must be preceded by a focused failing test whose failure is observed.
- Preserve the manual `POST /v1/events/{event_id}/reveal` flow and its idempotence.
- `AUTO_REVEAL_GROUPS` defaults to `true`; `false` restores matched-but-hidden behavior.
- Reuse `events_service.reveal`; do not duplicate its five-second deadline or state transition.
- Derive tablemate company, role, and profile from the canonical stored `Response.raw`; add no database column or migration.
- Never expose attendee tokens, attendee IDs, contacts, scores, embeddings, or match breakdowns to browser code or group-result JSON.
- Photos remain out of scope; avatars are deterministic initials only.
- The profile field is exact `t1` text. Clamp it visually but do not summarize, rewrite, or truncate it in transport.
- The requesting attendee is excluded from `tablemates`; missing company is represented as `null` and omitted visually.
- Preserve English and Spanish; role labels use the requesting attendee's stored questionnaire language.
- Mobile fills the viewport with safe-area padding; desktop centers a narrow surface without a fake phone frame.
- Preserve keyboard access, semantic lists/statuses, focus movement, reduced motion, and minimum 44px action targets.
- No new runtime dependency is required.

---

## File Structure

### Backend

- `app/core/config.py` — default-on automatic reveal setting.
- `.env.example` — deployment configuration documentation.
- `app/services/matching_runner.py` — arm the existing reveal after a successful partition when enabled.
- `app/schemas/attendees.py` — enriched `TablemateOut` contract.
- `app/services/publishing.py` — batch-load stored responses and map public tablemate profiles.
- `tests/test_matching_runner.py` — automatic lifecycle and idempotence.
- `tests/test_host_reveal.py` — explicit manual-mode preservation.
- `tests/test_reveal.py` — enriched contract and privacy assertions.
- `tests/test_lifecycle_e2e.py` — complete automatic lifecycle.

### Frontend

- `src/features/groupReveal/schemas/groupReveal.schema.ts` — browser-safe group contract.
- `src/features/groupReveal/model/groupReveal.model.ts` — initials and synchronized countdown pure functions.
- `src/features/groupReveal/api/server/attendeeSession.gateway.ts` — private resume redirect resolution.
- `src/features/groupReveal/api/server/groupReveal.gateway.ts` — group read and confirmation gateway.
- `src/features/groupReveal/api/groupReveal.api.ts` — same-origin browser client.
- `src/features/groupReveal/hooks/useGroupReveal.ts` — polling and view-state controller.
- `src/features/groupReveal/i18n/groupReveal.messages.ts` — English/Spanish copy.
- `src/features/groupReveal/components/*` — waiting, countdown, member list, result, notices, and screen.
- `src/app/questionnaire/[formToken]/group/page.tsx` — event-scoped result entry.
- `src/app/api/questionnaire/[formToken]/group/route.ts` — browser-safe group polling endpoint.
- `src/app/api/questionnaire/[formToken]/group/confirm/route.ts` — browser-safe confirmation endpoint.
- `src/features/questionnaire/components/Questionnaire.tsx` and controller tests — continue completed submissions to the group route.
- `src/features/conversation/fastQuestions/api/fastQuestions.api.ts` — API factory parameterized by route base.
- `src/features/conversation/components/Conversation.tsx` and `ConversationRouter.tsx` — injected conversation API and stable session key.
- `src/features/conversation/fastQuestions/api/server/formTokenFastQuestions.repository.ts` — attendee-session-backed conversation repository.
- `src/app/questionnaire/[formToken]/conversation/page.tsx` — guided conversation entry using form token.
- `src/app/api/questionnaire/[formToken]/conversation/{route,start,advance,continue}` — form-token conversation proxies.

---

### Task 1: Automatic backend reveal setting and lifecycle

**Files:**
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/app/core/config.py`
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/.env.example`
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/app/services/matching_runner.py`
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/tests/test_matching_runner.py`
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/tests/test_host_reveal.py`

**Interfaces:**
- Consumes: `events_service.reveal(session: AsyncSession, event: Event) -> Event`.
- Produces: `Settings.auto_reveal_groups: bool`, populated by `AUTO_REVEAL_GROUPS`, defaulting to `True`.

- [ ] **Step 1: Add failing default and override setting tests**

Add focused tests in `tests/test_matching_runner.py`:

```python
def test_auto_reveal_defaults_on(monkeypatch):
    monkeypatch.delenv("AUTO_REVEAL_GROUPS", raising=False)
    from app.core.config import Settings
    assert Settings(_env_file=None).auto_reveal_groups is True


def test_auto_reveal_can_be_disabled(monkeypatch):
    monkeypatch.setenv("AUTO_REVEAL_GROUPS", "false")
    from app.core.config import Settings
    assert Settings(_env_file=None).auto_reveal_groups is False
```

- [ ] **Step 2: Run the setting tests and observe the missing attribute failure**

Run from the backend repository:

```bash
rtk pytest tests/test_matching_runner.py -k "auto_reveal_defaults_on or auto_reveal_can_be_disabled" -q
```

Expected: FAIL because `Settings` has no `auto_reveal_groups`.

- [ ] **Step 3: Add the setting and environment documentation**

Add to `Settings`:

```python
auto_reveal_groups: bool = True
```

Add to `.env.example`:

```dotenv
# Automatically arm the shared countdown as soon as matching publishes groups.
# Set false to restore the host-triggered reveal flow.
AUTO_REVEAL_GROUPS=true
```

- [ ] **Step 4: Run the setting tests and observe them pass**

Run:

```bash
rtk pytest tests/test_matching_runner.py -k "auto_reveal_defaults_on or auto_reveal_can_be_disabled" -q
```

Expected: 2 PASS.

- [ ] **Step 5: Add failing automatic and manual lifecycle tests**

Update the successful partition test to assert the default lifecycle:

```python
await run_partition(event["id"], session=db_session)
await db_session.refresh(event_row)
assert event_row.state is EventState.live
assert event_row.reveal_at is not None
first_deadline = event_row.reveal_at

await run_partition(event["id"], session=db_session)
await db_session.refresh(event_row)
assert event_row.reveal_at == first_deadline
```

In `tests/test_host_reveal.py`, make `_matched_room` explicitly manual by setting
`AUTO_REVEAL_GROUPS=false`, clearing `get_settings` before the run, and restoring
the cache through `monkeypatch`/the autouse fixture. Keep assertions that the
event is `published`, `reveal_at is None`, and attendee reads return `204`.

- [ ] **Step 6: Run lifecycle tests and observe the old matched-but-hidden behavior fail**

Run:

```bash
rtk pytest tests/test_matching_runner.py tests/test_host_reveal.py -q
```

Expected: the automatic lifecycle assertion fails because `reveal_at` remains null.

- [ ] **Step 7: Call the existing reveal service after publishing**

Replace the final matching-runner comment/block with:

```python
await events_service.transition(s, event, EventState.published)
if get_settings().auto_reveal_groups:
    await events_service.reveal(s, event)
```

Do not assign `reveal_at` directly and do not alter `events_service.reveal`.

- [ ] **Step 8: Run lifecycle tests and preserve both modes**

Run:

```bash
rtk pytest tests/test_matching_runner.py tests/test_host_reveal.py tests/test_events.py -q
```

Expected: PASS; default matching enters `live`, explicit manual mode remains `published`, and manual reveal stays idempotent.

- [ ] **Step 9: Commit the backend lifecycle**

```bash
rtk git add app/core/config.py .env.example app/services/matching_runner.py tests/test_matching_runner.py tests/test_host_reveal.py
rtk git commit -m "feat(reveal): automatically arm matched groups"
```

---

### Task 2: Enriched tablemate profile contract

**Files:**
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/app/schemas/attendees.py`
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/app/services/publishing.py`
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/tests/test_reveal.py`
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/tests/test_attendee_view.py`

**Interfaces:**
- Consumes: `Response.raw` fields `language`, `company`, `s1_function`, and `t1`; `forms.definition.QUESTIONS` localized labels.
- Produces: `TablemateOut(display_name: str, company: str | None, role: str, profile: str)`.

- [ ] **Step 1: Add a failing enriched response test**

In `tests/test_reveal.py`, submit named fixture attendees with distinct company,
function, `t1`, and language values. After reveal, locate a known mate and assert:

```python
assert mate == {
    "display_name": "Maya Chen",
    "company": "Northline Labs",
    "role": "Engineering · Product",
    "profile": "Build healthier rituals for distributed teams.",
}
```

Add a Spanish viewer assertion that the same function renders
`"Ingeniería · Producto"`. Add an attendee with `company=None` and assert the
serialized company is null.

- [ ] **Step 2: Run the enriched response tests and observe missing keys**

Run:

```bash
rtk pytest tests/test_reveal.py -k "profile or localized or company" -q
```

Expected: FAIL because tablemates contain only `display_name`.

- [ ] **Step 3: Extend the Pydantic response schema**

Change `TablemateOut` to:

```python
class TablemateOut(BaseModel):
    display_name: str
    company: str | None
    role: str
    profile: str
```

- [ ] **Step 4: Add response-loading and role-label helpers**

In `publishing.py`, batch-select `Response` rows for the viewer and mates,
newest first, and retain the first response per attendee. Add pure helpers with
these signatures:

```python
def _normalized_company(raw: dict) -> str | None: ...
def _function_labels(language: str) -> dict[str, str]: ...
def _public_role(value: object, language: str) -> str: ...
```

`_function_labels` finds the `s1_function` question in `QUESTIONS` and maps
option values to `option.labels[language]`, falling back to English if the
viewer language is not `en` or `es`. `_public_role` uses that mapping and, for
unknown legacy strings, converts underscores to spaces and title-cases the
result; non-string values become `"Professional"`/`"Profesional"`.

- [ ] **Step 5: Return enriched profiles without new persistence**

In `get_my_table`, use the viewer response's language for every mate and build:

```python
{
    "display_name": mate.display_name,
    "company": _normalized_company(raw),
    "role": _public_role(raw.get("s1_function"), viewer_language),
    "profile": str(raw.get("t1") or "").strip(),
}
```

Raise/log an internal contract failure if a current response lacks `t1`; do not
fabricate profile text. Preserve the endpoint's `204` guard before constructing
public profiles.

- [ ] **Step 6: Tighten privacy assertions**

Replace the old exact-key assertion with:

```python
assert set(mate) == {"display_name", "company", "role", "profile"}
```

Also assert the flattened payload excludes `email`, `phone`, `attendee_id`,
`score`, `breakdown`, and `embedding`.

- [ ] **Step 7: Run focused and lifecycle tests**

Run:

```bash
rtk pytest tests/test_reveal.py tests/test_attendee_view.py tests/test_lifecycle_e2e.py -q
```

Expected: PASS.

- [ ] **Step 8: Commit the enriched backend contract**

```bash
rtk git add app/schemas/attendees.py app/services/publishing.py tests/test_reveal.py tests/test_attendee_view.py
rtk git commit -m "feat(reveal): include public tablemate profiles"
```

---

### Task 3: Frontend group schema, initials, and clock model

**Files:**
- Create: `src/features/groupReveal/schemas/groupReveal.schema.ts`
- Create: `src/features/groupReveal/schemas/groupReveal.schema.test.ts`
- Create: `src/features/groupReveal/model/groupReveal.model.ts`
- Create: `src/features/groupReveal/model/groupReveal.model.test.ts`

**Interfaces:**
- Produces: `groupRevealSchema`, `GroupReveal`, `initialsFor(name: string): string`, `avatarToneFor(name: string): number`, `countdownRemainingMs(revealAt: string, serverTime: string, receivedAtMs: number, nowMs: number): number`.

- [ ] **Step 1: Write failing schema tests**

Define a valid fixture with `group_index`, allowed color string, boolean
`confirmed`, ISO `reveal_at`, ISO `server_time`, and enriched tablemates. Assert
parsing retains nullable company and rejects missing role/profile, invalid dates,
negative group index, and unexpected attendee/contact/score fields using strict
objects.

- [ ] **Step 2: Run schema tests and observe the missing module failure**

```bash
rtk bun test src/features/groupReveal/schemas/groupReveal.schema.test.ts
```

Expected: FAIL because the schema module does not exist.

- [ ] **Step 3: Implement strict Zod schemas**

Use:

```ts
const tablemateSchema = z.object({
  display_name: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200).nullable(),
  role: z.string().trim().min(1).max(200),
  profile: z.string().trim().min(1).max(1_000),
}).strict();

export const groupRevealSchema = z.object({
  group_index: z.number().int().nonnegative(),
  colour: z.string().trim().min(1).max(20),
  confirmed: z.boolean(),
  reveal_at: z.iso.datetime({ offset: true }),
  server_time: z.iso.datetime({ offset: true }),
  tablemates: z.array(tablemateSchema).max(20),
}).strict();
```

Export `type GroupReveal = z.infer<typeof groupRevealSchema>`.

- [ ] **Step 4: Run schema tests and observe them pass**

```bash
rtk bun test src/features/groupReveal/schemas/groupReveal.schema.test.ts
```

- [ ] **Step 5: Write failing pure-model tests**

Cover `"Maya Chen" -> "MC"`, `"Prince" -> "P"`, whitespace, Unicode names,
and unusable punctuation -> `"?"`. Assert identical names return the same tone
index in `[0, 5]`. For timing, assert a server deadline 5 seconds ahead returns
5,000ms despite a client clock 90 seconds fast, decreases with `nowMs`, and
clamps past deadlines to zero.

- [ ] **Step 6: Run model tests and observe missing exports**

```bash
rtk bun test src/features/groupReveal/model/groupReveal.model.test.ts
```

- [ ] **Step 7: Implement deterministic pure functions**

Use Unicode letter/number detection (`/[^\p{L}\p{N}]+/u`) for initials, a small
stable string hash modulo six for avatar tone, and:

```ts
const serverAtReceipt = Date.parse(serverTime);
const revealDeadline = Date.parse(revealAt);
const serverNow = serverAtReceipt + (nowMs - receivedAtMs);
return Math.max(0, revealDeadline - serverNow);
```

- [ ] **Step 8: Run both focused test files and commit**

```bash
rtk bun test src/features/groupReveal/schemas/groupReveal.schema.test.ts src/features/groupReveal/model/groupReveal.model.test.ts
rtk git add src/features/groupReveal/schemas src/features/groupReveal/model
rtk git commit -m "feat(group-reveal): define safe result model"
```

---

### Task 4: Secure attendee-session and group gateways

**Files:**
- Create: `src/features/groupReveal/api/server/attendeeSession.gateway.ts`
- Create: `src/features/groupReveal/api/server/attendeeSession.gateway.test.ts`
- Create: `src/features/groupReveal/api/server/groupReveal.gateway.ts`
- Create: `src/features/groupReveal/api/server/groupReveal.gateway.test.ts`

**Interfaces:**
- Produces: `resolveAttendeeSession(formToken: string, cookieHeader: string | null, fetchImpl?: typeof fetch): Promise<{token:string; eventId:string}>`.
- Produces: `loadGroup(formToken, cookieHeader, fetchImpl?) -> Promise<{status:"waiting"}|{status:"ready"; group:GroupReveal}>`.
- Produces: `confirmGroup(formToken, cookieHeader, fetchImpl?) -> Promise<void>`.
- Produces typed `AttendeeSessionGatewayError` and `GroupRevealGatewayError` codes for safe Route Handler mapping.

- [ ] **Step 1: Write failing attendee-session resolver tests**

Assert the resolver calls `/f/{encodedToken}/resume` with `redirect: "manual"`,
`cache: "no-store"`, the original `Cookie` header, and timeout signal. Assert it
accepts only `302` plus relative `/a/{token}`, URL-decodes the final path segment,
matches that token to exactly one `weft_attendee_{32HexChars}` cookie, and returns
the token plus its hyphenated UUID event ID. Reject missing/ambiguous cookie
matches, `401`, `404`, absolute/external locations, extra path segments, query
strings, and network errors. Assert thrown messages never contain the form or
attendee token.

- [ ] **Step 2: Run resolver tests and observe the missing module failure**

```bash
rtk bun test src/features/groupReveal/api/server/attendeeSession.gateway.test.ts
```

- [ ] **Step 3: Implement the server-only resolver**

Start the file with `import "server-only"`. Build the resume URL through `URL`,
forward only the cookie header, disable redirect following, and validate location
with a URL/path parser rather than substring matching. Parse cookies without
logging them; compare decoded values with the resume token; validate the matching
cookie suffix as 32 hex characters and format it as a UUID. Map missing/invalid
session to `"no_session"` and transport/shape failures to `"unavailable"`.

- [ ] **Step 4: Write failing group gateway tests**

Use an injected resolver/fetch seam. Assert GET `/a/{encodedToken}` maps `204` to
`waiting`, validates `200` with `groupRevealSchema`, and rejects invalid bodies.
Assert confirmation posts `/a/{encodedToken}/confirm`, accepts `200`, and maps
`401/404`, `409`, timeout, and `5xx` to stable codes. Inspect returned values and
errors to prove no token is exposed.

- [ ] **Step 5: Run gateway tests and observe missing behavior**

```bash
rtk bun test src/features/groupReveal/api/server/groupReveal.gateway.test.ts
```

- [ ] **Step 6: Implement group load and confirmation**

Both operations first call `resolveAttendeeSession` and use its token; both use `cache: "no-store"`
and `AbortSignal.timeout(8_000)`. Parse group JSON through `groupRevealSchema`.
Log only operation plus status/category, never URLs or tokens.

- [ ] **Step 7: Run gateway tests and commit**

```bash
rtk bun test src/features/groupReveal/api/server/attendeeSession.gateway.test.ts src/features/groupReveal/api/server/groupReveal.gateway.test.ts
rtk git add src/features/groupReveal/api/server
rtk git commit -m "feat(group-reveal): add secure attendee gateway"
```

---

### Task 5: Group Route Handlers and browser API

**Files:**
- Create: `src/app/api/questionnaire/[formToken]/group/route.ts`
- Create: `src/app/api/questionnaire/[formToken]/group/route.test.ts`
- Create: `src/app/api/questionnaire/[formToken]/group/confirm/route.ts`
- Create: `src/app/api/questionnaire/[formToken]/group/confirm/route.test.ts`
- Create: `src/features/groupReveal/api/groupReveal.api.ts`
- Create: `src/features/groupReveal/api/groupReveal.api.test.ts`

**Interfaces:**
- Consumes: `formTokenSchema`, `loadGroup`, and `confirmGroup`.
- Produces: `GroupRevealClient.load(formToken): Promise<{status:"waiting"}|{status:"ready"; group:GroupReveal}>` and `confirm(formToken): Promise<void>`.

- [ ] **Step 1: Write failing Route Handler tests**

For GET, assert invalid form tokens return `400`, gateway waiting returns `204`,
ready returns browser-safe JSON, missing session maps to `401`, and unavailable
maps to `503`. For POST confirm, assert the same validation/error mapping and a
successful `{status:"confirmed"}` body. Every response must include
`Cache-Control: no-store`.

- [ ] **Step 2: Run Route Handler tests and observe missing modules**

```bash
rtk bun test 'src/app/api/questionnaire/[formToken]/group/route.test.ts' 'src/app/api/questionnaire/[formToken]/group/confirm/route.test.ts'
```

- [ ] **Step 3: Implement thin Route Handlers**

Read `request.headers.get("cookie")`, never cookies from client JSON. Validate
the awaited `params.formToken`, delegate to the gateway, and map only stable
gateway codes. Return no token, redirect location, or upstream error detail.

- [ ] **Step 4: Write failing browser-client tests**

Assert `load` treats `204` as `{status:"waiting"}`, validates ready JSON, and
throws `GroupRevealClientError(status, code)` for non-OK or invalid JSON.
Assert `confirm` performs POST and requires `{status:"confirmed"}`. Verify form
tokens are encoded in both paths and requests use the 8-second timeout.

- [ ] **Step 5: Run browser-client tests and observe missing behavior**

```bash
rtk bun test src/features/groupReveal/api/groupReveal.api.test.ts
```

- [ ] **Step 6: Implement the browser client and rerun all focused tests**

Use `groupRevealSchema` for ready responses and export a default client plus the
interface for hook injection.

```bash
rtk bun test 'src/app/api/questionnaire/[formToken]/group/route.test.ts' 'src/app/api/questionnaire/[formToken]/group/confirm/route.test.ts' src/features/groupReveal/api/groupReveal.api.test.ts
```

- [ ] **Step 7: Commit the BFF endpoints**

```bash
rtk git add 'src/app/api/questionnaire/[formToken]/group' src/features/groupReveal/api/groupReveal.api.ts src/features/groupReveal/api/groupReveal.api.test.ts
rtk git commit -m "feat(group-reveal): expose browser-safe group routes"
```

---

### Task 6: Polling and countdown controller

**Files:**
- Create: `src/features/groupReveal/hooks/useGroupReveal.ts`
- Create: `src/features/groupReveal/hooks/useGroupReveal.mount.tsx`
- Create: `src/features/groupReveal/hooks/useGroupReveal.test.tsx`

**Interfaces:**
- Consumes: `GroupRevealClient`, `countdownRemainingMs`, and `GroupReveal`.
- Produces: `GroupRevealView = {state:"waiting"}|{state:"countdown"; seconds:number}|{state:"revealed"; group:GroupReveal; confirming:boolean}|{state:"error"; kind:"session"|"unavailable"}` plus `retry()` and `confirm()`.

- [ ] **Step 1: Write failing controller interaction tests**

Use the repository's JSDOM mount pattern and fake timers. Cover:

```ts
// immediate load -> 204 -> 2s poll
// 2s polling through 30s, then 5s polling
// no overlapping request while a promise remains unresolved
// pause while document.visibilityState === "hidden"
// immediate refetch when visible
// ready/future deadline -> countdown, then revealed without refetch
// past deadline -> revealed immediately
// confirmed payload -> confirmed CTA state
// failed confirm -> revealed with retryable action
// missing session -> terminal session error
// transient load error -> manual retry
```

- [ ] **Step 2: Run controller tests and observe the missing hook failure**

```bash
rtk bun test src/features/groupReveal/hooks/useGroupReveal.test.tsx
```

- [ ] **Step 3: Implement one-request-at-a-time polling**

Use refs for active request, timer, mounted state, first poll time, and retained
group. Schedule 2,000ms while elapsed `< 30_000`, otherwise 5,000ms. Clear the
timer on unmount/hidden and call `load()` immediately on visible. Do not use a
fixed `setInterval`.

- [ ] **Step 4: Implement synchronized countdown and confirmation**

Capture `receivedAtMs` when the ready response resolves. Tick displayed whole
seconds using a short timeout aligned to the next second boundary. Reveal at
zero. `confirm()` guards duplicate calls and merges `confirmed: true` into the
retained group after success.

- [ ] **Step 5: Run controller tests and commit**

```bash
rtk bun test src/features/groupReveal/hooks/useGroupReveal.test.tsx src/features/groupReveal/model/groupReveal.model.test.ts
rtk git add src/features/groupReveal/hooks
rtk git commit -m "feat(group-reveal): orchestrate waiting and countdown"
```

---

### Task 7: Group reveal presentation and page

**Files:**
- Create: `src/features/groupReveal/i18n/groupReveal.messages.ts`
- Create: `src/features/groupReveal/i18n/groupReveal.messages.test.ts`
- Create: `src/features/groupReveal/components/InitialsAvatar.tsx`
- Create: `src/features/groupReveal/components/GroupWaiting.tsx`
- Create: `src/features/groupReveal/components/GroupCountdown.tsx`
- Create: `src/features/groupReveal/components/GroupMemberList.tsx`
- Create: `src/features/groupReveal/components/GroupResult.tsx`
- Create: `src/features/groupReveal/components/GroupRevealNotice.tsx`
- Create: `src/features/groupReveal/components/GroupRevealScreen.tsx`
- Create: `src/features/groupReveal/components/GroupReveal.module.css`
- Create: `src/features/groupReveal/components/GroupReveal.presentation.test.tsx`
- Create: `src/features/groupReveal/components/GroupReveal.layout.test.ts`
- Create: `src/app/questionnaire/[formToken]/group/page.tsx`
- Create: `src/app/questionnaire/[formToken]/group/page.test.tsx`

**Interfaces:**
- Consumes: `useGroupReveal(formToken)`, `initialsFor`, `avatarToneFor`.
- Produces: the complete private group page and navigation to `/questionnaire/{formToken}/conversation` after confirmation.

- [ ] **Step 1: Write failing dictionary and presentation tests**

Pin identical English/Spanish keys and dynamic helpers for connection count,
group label, waiting, countdown, found-group CTA, confirmed CTA, empty group,
session error, unavailable error, and retry. Render every state and assert:

- waiting uses a polite status and has no member data;
- countdown announces the whole number and has no hidden member list;
- result uses `h1`, semantic `ul/li`, name headings, role/company punctuation,
  profile text, table text plus color token, and connection count;
- null company renders role without a stray dot;
- the full profile remains in accessible text while CSS clamps visually;
- unconfirmed and confirmed CTAs have correct behavior;
- empty tablemates render honest copy;
- decorative connector/avatar content is hidden appropriately.

- [ ] **Step 2: Run presentation tests and observe missing components**

```bash
rtk bun test src/features/groupReveal/i18n/groupReveal.messages.test.ts src/features/groupReveal/components/GroupReveal.presentation.test.tsx
```

- [ ] **Step 3: Implement localized copy and focused components**

Keep each component presentational. `GroupRevealScreen` is the only component
that binds the hook. Use `router.push` only when the confirmed CTA is activated:

```ts
router.push(`/questionnaire/${encodeURIComponent(formToken)}/conversation`);
```

The result heading receives programmatic focus once after countdown completion.

- [ ] **Step 4: Implement reference-informed CSS**

Use existing CSS variables/tokens. Required layout assertions:

```css
.shell { min-height: 100svh; min-height: 100dvh; }
.frame { width: min(100%, 42rem); margin-inline: auto; }
.actionDock { position: sticky; bottom: 0; padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
.profile { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
@media (prefers-reduced-motion: reduce) { /* zero nonessential transitions */ }
```

Use a warm paper/bone surface, ink type, ember CTA, hairline separators, subtle
woven connector, and no gradients/heavy shadows/glass cards/fake phone chrome.

- [ ] **Step 5: Add the private App Router page and metadata test**

Validate `formToken` with the existing schema, render the session notice for an
invalid link, export `dynamic = "force-dynamic"`, and metadata with
`robots: {index:false, follow:false}`.

- [ ] **Step 6: Run presentation, layout, and page tests**

```bash
rtk bun test src/features/groupReveal 'src/app/questionnaire/[formToken]/group/page.test.tsx'
```

Expected: PASS with no accessibility/presentation assertion failures.

- [ ] **Step 7: Commit the group experience**

```bash
rtk git add src/features/groupReveal 'src/app/questionnaire/[formToken]/group'
rtk git commit -m "feat(group-reveal): build waiting and result experience"
```

---

### Task 8: Continue questionnaire completion into group waiting

**Files:**
- Modify: `src/features/questionnaire/components/Questionnaire.tsx`
- Modify: `src/features/questionnaire/components/Questionnaire.interaction.mount.tsx`
- Modify: `src/features/questionnaire/components/Questionnaire.interaction.test.ts`
- Modify: `src/features/questionnaire/hooks/useQuestionnaireController.ts`
- Modify: `src/features/questionnaire/hooks/useQuestionnaireController.test.tsx`

**Interfaces:**
- Consumes: the existing successful submission and completed draft marker.
- Produces: `onCompleted(formToken)` navigation to `/questionnaire/{formToken}/group` after submit and on completed-draft restoration.

- [ ] **Step 1: Write failing navigation interaction tests**

Inject a navigation callback into `Questionnaire`. Assert it is not called
during answering or a failed submission, is called once after
`submissionSucceeded`, and is called once after hydration finds a completed
record. Keep the security assertion that serialized local storage contains no
`attendee_token`.

- [ ] **Step 2: Run the interaction tests and observe no navigation**

```bash
rtk bun test src/features/questionnaire/components/Questionnaire.interaction.test.ts src/features/questionnaire/hooks/useQuestionnaireController.test.tsx
```

- [ ] **Step 3: Add a completion callback at the controller boundary**

Expose a single completion signal/callback that fires after the completed
marker is durable. In the production component, use `useRouter` to replace the
current page with:

```ts
`/questionnaire/${encodeURIComponent(formToken)}/group`
```

Use `replace` so Back does not reopen the final composer. Retain
`QuestionnaireCompletion` only as the brief no-JS/render fallback while
navigation is pending.

- [ ] **Step 4: Run questionnaire tests and commit**

```bash
rtk bun test src/features/questionnaire
rtk git add src/features/questionnaire
rtk git commit -m "feat(questionnaire): continue to group waiting"
```

---

### Task 9: Form-token guided conversation transport

**Files:**
- Modify: `src/features/conversation/fastQuestions/api/fastQuestions.api.ts`
- Modify: `src/features/conversation/fastQuestions/api/fastQuestions.api.test.ts`
- Modify: `src/features/conversation/components/Conversation.tsx`
- Modify: `src/features/conversation/components/ConversationRouter.tsx`
- Modify: `src/features/conversation/components/ConversationRouter.test.tsx`
- Create: `src/features/conversation/fastQuestions/api/server/formTokenFastQuestions.repository.ts`
- Create: `src/features/conversation/fastQuestions/api/server/formTokenFastQuestions.repository.test.ts`
- Create: `src/app/questionnaire/[formToken]/conversation/page.tsx`
- Create: `src/app/questionnaire/[formToken]/conversation/page.test.tsx`
- Create: `src/app/api/questionnaire/[formToken]/conversation/route.ts`
- Create: `src/app/api/questionnaire/[formToken]/conversation/route.test.ts`
- Create: `src/app/api/questionnaire/[formToken]/conversation/start/route.ts`
- Create: `src/app/api/questionnaire/[formToken]/conversation/start/route.test.ts`
- Create: `src/app/api/questionnaire/[formToken]/conversation/advance/route.ts`
- Create: `src/app/api/questionnaire/[formToken]/conversation/advance/route.test.ts`
- Create: `src/app/api/questionnaire/[formToken]/conversation/continue/route.ts`
- Create: `src/app/api/questionnaire/[formToken]/conversation/continue/route.test.ts`

**Interfaces:**
- Consumes: `resolveAttendeeSession`, `createFastQuestionsGateway`, existing `ConversationApi`, schemas, mapper, provider, and screens.
- Produces: `createConversationApi(apiBase: (sessionKey:string) => string): ConversationApi`; preserves exported default `conversationApi` for `/api/events/{eventId}/conversation`.
- Produces: form-token conversation page and proxy operations get/start/advance/continue.

- [ ] **Step 1: Write failing API factory regression tests**

Assert the existing default API still calls `/api/events/{id}/conversation`.
Create a form-token API and assert its four operations call:

```text
/api/questionnaire/{formToken}/conversation
/api/questionnaire/{formToken}/conversation/start
/api/questionnaire/{formToken}/conversation/advance
/api/questionnaire/{formToken}/conversation/continue
```

All identifiers must be encoded and existing response validation retained.

- [ ] **Step 2: Run the API tests and observe the missing factory failure**

```bash
rtk bun test src/features/conversation/fastQuestions/api/fastQuestions.api.test.ts
```

- [ ] **Step 3: Refactor the browser API behind a factory**

Rename the method parameter conceptually to `sessionKey` without changing the
`ConversationApi` public signatures. Export:

```ts
export function createConversationApi(basePath: (sessionKey: string) => string): ConversationApi
```

Build the default `conversationApi` with the current event path and export
`formTokenConversationApi` with the questionnaire path.

- [ ] **Step 4: Write failing repository tests**

Inject `resolveAttendeeSession` via a factory/closure, then assert get/start/
advance/continue delegate to `createFastQuestionsGateway` with the resolved
token, pass the resolved UUID into the existing conversation mapper, and
preserve request bodies and mapped sessions. Assert session and
upstream errors retain stable codes and never include the token.

- [ ] **Step 5: Implement the form-token repository**

Create a repository per request using the incoming cookie header:

```ts
createFormTokenFastQuestionsRepository(formToken, cookieHeader, fetchImpl?)
```

Resolve `{token, eventId}` once. Its gateway `readToken` returns `token`, while
all gateway operations receive `eventId` so the mapped `ConversationSession`
retains the real UUID required by the existing feedback route.

- [ ] **Step 6: Write failing form-token Route Handler tests**

Mirror the existing event route tests but validate `formToken`, use the new
repository, set `Cache-Control: no-store`, map missing session to `401`, no
icebreaker to `503` with `no_session`, unavailable to `503`, and validate the
advance body with `advanceParticipantInputSchema`.

- [ ] **Step 7: Implement the four proxy Route Handlers**

Keep handlers thin and consistent. Each reads `Cookie`, creates the repository,
invokes exactly one operation, and returns the mapped browser-safe session.

- [ ] **Step 8: Inject the API through the conversation component tree**

Extend `ConversationProps` to accept optional `api?: ConversationApi` and
`sessionKey?: string` if the route identifier differs from the display event ID.
Pass the same key/API to `ConversationRouter`, `useConversationSession`, and
`FastQuestionsExperience`, ensuring one TanStack Query cache key per transport.
When rendering `SharedChallengeComplete`, pass `session.eventId` rather than the
transport key so its existing feedback link remains a real event UUID. Existing
`/e/{eventId}/conversation` call sites remain unchanged.

- [ ] **Step 9: Add the form-token conversation page**

Validate the form token, export private metadata, and render:

```tsx
<Conversation
  api={formTokenConversationApi}
  eventId={formToken}
/>
```

The prop remains the stable session key; backend participant mapping must use
the viewer data already present in the icebreaker DTO, never infer identity
from the form token.

- [ ] **Step 10: Run conversation and route tests**

```bash
rtk bun test src/features/conversation 'src/app/api/questionnaire/[formToken]/conversation' 'src/app/questionnaire/[formToken]/conversation/page.test.tsx'
```

Expected: PASS, including existing event-ID transport regressions.

- [ ] **Step 11: Commit the conversation handoff**

```bash
rtk git add src/features/conversation 'src/app/api/questionnaire/[formToken]/conversation' 'src/app/questionnaire/[formToken]/conversation'
rtk git commit -m "feat(conversation): support attendee form sessions"
```

---

### Task 10: Cross-service lifecycle and complete verification

**Files:**
- Modify: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend/tests/test_lifecycle_e2e.py`
- Modify: `src/features/groupReveal/components/GroupReveal.interaction.mount.tsx` if the existing mount helper needs an integration harness.
- Create: `src/features/groupReveal/components/GroupReveal.interaction.test.ts`
- Modify: `README.md` only if local run instructions do not already explain `WEFT_B2B_API_URL` and backend startup.

**Interfaces:**
- Consumes: all prior backend and frontend contracts.
- Produces: evidence that the real lifecycle works and both repositories remain healthy.

- [ ] **Step 1: Add the failing backend lifecycle assertion**

Extend `test_lifecycle_e2e.py` so the normal path no longer posts the host
reveal endpoint. After `run_partition`, assert the attendee GET is `200`,
`reveal_at > server_time`, enriched tablemates contain only the four public
keys, confirmation is idempotent, and the icebreaker GET returns its existing
session state.

- [ ] **Step 2: Run the backend lifecycle test**

```bash
rtk pytest tests/test_lifecycle_e2e.py -q
```

Expected: PASS after Tasks 1–2; if it fails, fix the earliest owning task rather
than weakening the lifecycle assertion.

- [ ] **Step 3: Add a frontend full-flow interaction test**

Drive the screen with a fake client through waiting → future-deadline countdown
→ reveal → failed confirmation → retry → confirmed CTA. Assert the conversation
navigation occurs only after confirmation and no rendered HTML contains a fake
attendee token fixture.

- [ ] **Step 4: Run the frontend lifecycle interaction**

```bash
rtk bun test src/features/groupReveal/components/GroupReveal.interaction.test.ts
```

- [ ] **Step 5: Run complete backend verification**

From the backend repository:

```bash
rtk pytest tests/ -q
rtk ruff check app tests
rtk alembic current
rtk git diff --check
```

Expected: all non-live tests pass, Ruff reports no errors, Alembic reports the
current head, and diff check is empty.

- [ ] **Step 6: Run complete frontend verification**

From the frontend repository:

```bash
rtk bun test
rtk lint
rtk bun run build
rtk git diff --check
```

Expected: all Bun tests pass, ESLint reports no errors, Next.js production build
exits zero, and diff check is empty.

- [ ] **Step 7: Run browser QA with both services**

Start the backend and frontend using their documented local commands. In a
representative phone viewport, submit a real event questionnaire, observe calm
waiting, run matching, verify automatic 3–2–1 and the enriched initials-based
group result, confirm the group, and open guided conversation. Repeat the group
route checks at small-laptop and desktop widths, with Spanish, missing company,
reduced motion, keyboard-only navigation, hidden-tab resume, and a simulated
network interruption.

- [ ] **Step 8: Inspect both repository diffs against the spec**

```bash
rtk git status --short
rtk git diff --stat
```

Run in each repository. Confirm only feature-related files changed and every
acceptance criterion in the design spec has an implementation/test owner.

- [ ] **Step 9: Commit final lifecycle coverage or documentation changes**

Backend, if changed:

```bash
rtk git add tests/test_lifecycle_e2e.py README.md
rtk git commit -m "test(reveal): cover automatic attendee lifecycle"
```

Frontend, if changed:

```bash
rtk git add src/features/groupReveal README.md
rtk git commit -m "test(group-reveal): cover complete attendee flow"
```

Do not create an empty commit when a repository has no final-step changes.
