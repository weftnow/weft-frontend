# Sender Return Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the sender a durable, cookie-independent URL that resolves to the result their invite produced.

**Architecture:** Every invite gains a sibling `return_token`, minted at the same moment and never sent to the friend. Pairs record the invite that produced them, so a return token resolves to exactly that invitation's pairings rather than everything the sender belongs to. The frontend adds `/match/thread/<return_token>`, which reuses the existing pair-list validator and notice components.

**Tech Stack:** weft_core — Python 3.11, FastAPI, psycopg, pytest. web-frontend — Next.js 16.2.11 (App Router), React, TypeScript, `bun test`.

## Global Constraints

- The return token **never expires**. Do not add a TTL column, an `expires_at`, or an expiry check to it. Invites keep their existing `WEFT_INVITE_TTL_DAYS`; the return token deliberately outlives its invite.
- The return token is **never** sent to the friend. It must not appear in any response from `GET /api/invite/{token}` or on any page under `/match/invite/`.
- `weft_core` lands and merges **before** web-frontend. The frontend depends on `return_token` and `GET /api/thread/{token}` existing.
- Work on a feature branch in each repository, never on `main`. web-frontend: `feat/sender-return-link` (already created). weft_core: create `feat/sender-return-link`.
- Commit messages: Conventional Commits with a scope. No `Co-Authored-By` trailer.
- Backend responses for thread pairs must be built with the existing `_pair_body` helper so the shape matches `/api/session/{session_id}/pairs` exactly.
- `pairs.invite_token` is **nullable**. Pairs created before this feature cannot be backfilled, and `schema.sql` must match what a migrated database looks like.

---

## Task 1: Storage carries the return token and the pair's invite

**Files:**
- Modify: `weft_core/weft/storage.py`
- Test: `weft_core/tests/test_storage.py`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `Invite.return_token: str`; `Pair.invite_token: str | None`; `Storage.get_invite_by_return_token(return_token: str) -> Invite | None`; `Storage.list_pairs_for_invite(invite_token: str) -> list[Pair]` (newest first).

- [ ] **Step 1: Write the failing test**

Append to `weft_core/tests/test_storage.py`:

```python
def test_invite_is_findable_by_its_return_token():
    store = InMemoryStorage()
    store.add_invite(Invite(token="out-1", return_token="in-1",
                            from_session_id="s1", created_at="2026-07-30T10:00:00Z",
                            expires_at="2026-08-29T10:00:00Z"))

    found = store.get_invite_by_return_token("in-1")
    assert found is not None and found.token == "out-1"
    # The outbound token must not resolve as a return token.
    assert store.get_invite_by_return_token("out-1") is None
    assert store.get_invite_by_return_token("nope") is None


def test_pairs_list_for_one_invite_newest_first():
    store = InMemoryStorage()
    for sid in ("s1", "s2", "s3"):
        store.add_session(Session(id=sid, name=sid, email=f"{sid}@x.com", phone="+1",
                                  answers={}, question_set=[], created_at="2026-07-30T10:00:00Z"))
    store.add_pair(Pair(id="p1", session_a="s1", session_b="s2",
                        created_at="2026-07-30T10:00:00Z", invite_token="out-1"))
    store.add_pair(Pair(id="p2", session_a="s1", session_b="s3",
                        created_at="2026-07-30T11:00:00Z", invite_token="out-1"))
    store.add_pair(Pair(id="p3", session_a="s1", session_b="s3",
                        created_at="2026-07-30T12:00:00Z", invite_token="out-2"))

    ids = [p.id for p in store.list_pairs_for_invite("out-1")]
    assert ids == ["p2", "p1"]
    assert store.list_pairs_for_invite("out-2") == [store.get_pair("p3")]
    assert store.list_pairs_for_invite("unknown") == []


def test_pairs_without_an_invite_never_match():
    store = InMemoryStorage()
    store.add_pair(Pair(id="old", session_a="s1", session_b="s2",
                        created_at="2026-07-30T10:00:00Z", invite_token=None))
    assert store.list_pairs_for_invite("out-1") == []
```

Ensure the file's imports include `Invite`, `Pair`, `Session`, `InMemoryStorage` from `weft.storage`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/weft_core && pytest tests/test_storage.py -v -k "return_token or for_one_invite or without_an_invite"`
Expected: FAIL — `TypeError: Invite.__init__() got an unexpected keyword argument 'return_token'`

- [ ] **Step 3: Write minimal implementation**

In `weft/storage.py`, add the field to `Invite` and `Pair`:

```python
@dataclass
class Invite:
    token: str
    from_session_id: str
    created_at: str
    expires_at: str
    # The sender's way back. Minted with the invite, never sent to the friend,
    # and deliberately without an expiry of its own: the invite stops accepting
    # answers after its TTL, but the result it produced stays reachable.
    return_token: str = ""


@dataclass
class Pair:
    id: str
    session_a: str
    session_b: str
    created_at: str
    # Which invitation produced this pair. Nullable: pairs created before the
    # return link existed cannot be backfilled.
    invite_token: str | None = None
```

Add to the `Storage` protocol:

```python
    def get_invite_by_return_token(self, return_token: str) -> Invite | None: ...
    def list_pairs_for_invite(self, invite_token: str) -> list[Pair]: ...
```

In `InMemoryStorage.__init__`, add the reverse index:

```python
        self._invites_by_return: dict[str, Invite] = {}
```

Extend `add_invite` and add the two lookups:

```python
    def add_invite(self, invite):
        self._invites[invite.token] = invite
        if invite.return_token:
            self._invites_by_return[invite.return_token] = invite

    def get_invite_by_return_token(self, return_token):
        return self._invites_by_return.get(return_token)

    def list_pairs_for_invite(self, invite_token):
        mine = [p for p in self._pairs.values() if p.invite_token == invite_token]
        return sorted(mine, key=lambda p: p.created_at, reverse=True)
```

Note the `if invite.return_token:` guard — it stops an empty default from indexing every invite under `""`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/weft_core && pytest tests/test_storage.py -v`
Expected: PASS, including all pre-existing tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/shearytan/Documents/SurnX/weft_core
git add weft/storage.py tests/test_storage.py
git commit -m "feat(storage): carry a return token and the pair's originating invite"
```

---

## Task 2: Postgres schema, migration, and storage

**Files:**
- Modify: `weft_core/db/schema.sql:19-35`
- Create: `weft_core/db/migrations/2026-07-30-add-return-link-columns.sql`
- Modify: `weft_core/weft/postgres_storage.py`
- Test: `weft_core/tests/test_postgres_storage.py`

**Interfaces:**
- Consumes: `Invite.return_token`, `Pair.invite_token` from Task 1.
- Produces: `PostgresStorage.get_invite_by_return_token`, `PostgresStorage.list_pairs_for_invite` — same signatures as Task 1.

- [ ] **Step 1: Write the failing test**

Follow the existing idiom in `tests/test_postgres_storage.py` (read the top of that file first — it decides how a database is obtained and whether tests skip without one). Add:

```python
def test_return_token_and_invite_scoped_pairs_round_trip(store):
    store.add_session(Session(id="s1", name="Ana", email="a@x.com", phone="+1",
                              answers={}, question_set=[], created_at="2026-07-30T10:00:00Z"))
    store.add_session(Session(id="s2", name="Ben", email="b@x.com", phone="+1",
                              answers={}, question_set=[], created_at="2026-07-30T10:00:00Z"))
    store.add_invite(Invite(token="out-1", return_token="in-1", from_session_id="s1",
                            created_at="2026-07-30T10:00:00Z",
                            expires_at="2026-08-29T10:00:00Z"))

    found = store.get_invite_by_return_token("in-1")
    assert found is not None and found.token == "out-1"
    assert store.get_invite_by_return_token("out-1") is None

    store.add_pair(Pair(id="p1", session_a="s1", session_b="s2",
                        created_at="2026-07-30T11:00:00Z", invite_token="out-1"))
    assert [p.id for p in store.list_pairs_for_invite("out-1")] == ["p1"]
    assert store.list_pairs_for_invite("out-2") == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/weft_core && pytest tests/test_postgres_storage.py -v -k return_token`
Expected: FAIL — undefined column `return_token`. If the suite skips without a database, note that and continue; Step 4 must be run against a real database before the commit is considered done.

- [ ] **Step 3: Write minimal implementation**

`db/schema.sql` — replace the `invites` and `pairs` blocks:

```sql
create table invites (
  token text primary key,
  return_token text unique,
  from_session_id text not null references sessions(id),
  created_at timestamptz not null,
  expires_at timestamptz not null
);
create table pairs (
  id text primary key,
  session_a text not null references sessions(id),
  session_b text not null references sessions(id),
  created_at timestamptz not null,
  -- Which invitation produced this pair. Nullable so this file matches a
  -- database migrated from before the return link, where old rows have none.
  invite_token text references invites(token)
);
create index pairs_invite_token_idx on pairs (invite_token);
```

Keep the two existing `pairs_session_a_idx` / `pairs_session_b_idx` indexes and their comment exactly as they are.

Create `db/migrations/2026-07-30-add-return-link-columns.sql`:

```sql
-- Add the return-link columns to an EXISTING database.
-- schema.sql already carries them for fresh databases; this migration brings
-- an older database up to date.
--
-- Apply with:  psql "$DATABASE_URL" -f db/migrations/2026-07-30-add-return-link-columns.sql
--
-- Both columns are nullable. Invites minted before this change have no return
-- token, and pairs created before it cannot be attributed to an invite -- there
-- is no record of which invitation produced them. Those senders keep the cookie
-- path; only new invites gain a return link.

alter table invites add column if not exists return_token text;
alter table pairs add column if not exists invite_token text references invites(token);

-- Unique rather than primary: existing rows hold NULL, and Postgres allows
-- many NULLs under a unique constraint.
create unique index if not exists invites_return_token_idx on invites (return_token);
create index if not exists pairs_invite_token_idx on pairs (invite_token);
```

`weft/postgres_storage.py` — update the two inserts and both selects, and add the two lookups. Match the file's existing style for row-to-dataclass mapping:

```python
            conn.execute(
                "insert into invites (token, return_token, from_session_id, created_at, expires_at)"
                " values (%s, %s, %s, %s, %s)",
                (i.token, i.return_token or None, i.from_session_id, i.created_at, i.expires_at))
```

```python
            conn.execute(
                "insert into pairs (id, session_a, session_b, created_at, invite_token)"
                " values (%s, %s, %s, %s, %s)",
                (p.id, p.session_a, p.session_b, p.created_at, p.invite_token))
```

Every existing `select` against `invites` must now also read `return_token`, and every `select` against `pairs` must read `invite_token`, with the dataclass constructions updated to pass them. Then add:

```python
    def get_invite_by_return_token(self, return_token: str) -> Invite | None:
        with self._conn() as conn:
            row = conn.execute(
                "select token, return_token, from_session_id, created_at, expires_at"
                " from invites where return_token = %s", (return_token,)).fetchone()
        return None if row is None else Invite(*row)

    def list_pairs_for_invite(self, invite_token: str) -> list[Pair]:
        with self._conn() as conn:
            rows = conn.execute(
                "select id, session_a, session_b, created_at, invite_token from pairs"
                " where invite_token = %s order by created_at desc", (invite_token,)).fetchall()
        return [Pair(*r) for r in rows]
```

Adjust `self._conn()` and row unpacking to match whatever the file already does — read the neighbouring methods and copy their pattern rather than assuming this one.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/weft_core && pytest tests/test_postgres_storage.py -v`
Expected: PASS against a real database. If it skips, apply `db/migrations/2026-07-30-add-return-link-columns.sql` to a scratch database and re-run before continuing.

- [ ] **Step 5: Commit**

```bash
cd /Users/shearytan/Documents/SurnX/weft_core
git add db/schema.sql db/migrations/2026-07-30-add-return-link-columns.sql weft/postgres_storage.py tests/test_postgres_storage.py
git commit -m "feat(storage): persist the return token and pair invite in postgres"
```

---

## Task 3: Mint the return token and record it on the pair

**Files:**
- Modify: `weft_core/weft/api.py:93-102` (`_issue_invite`), `:145-161` (`post_answers`), `:163-167` (`post_invite`)
- Test: `weft_core/tests/test_api.py`

**Interfaces:**
- Consumes: Task 1 dataclasses and Task 2 persistence.
- Produces: `POST /api/answers` and `POST /api/invite` both return `return_token: str`. Pairs created by `POST /api/answers` carry `invite_token`.

- [ ] **Step 1: Write the failing test**

Append to `weft_core/tests/test_api.py`:

```python
def test_submitting_returns_a_return_token_distinct_from_the_share_token():
    c = client()
    body = c.post("/api/answers", json={"name": "Ana", "email": "a@x.com",
                                        "phone": "+1", "answers": _answers()}).json()
    assert body["return_token"]
    assert body["return_token"] != body["share_token"]


def test_minting_an_invite_returns_both_tokens():
    c = client()
    sid = c.post("/api/answers", json={"name": "Ana", "email": "a@x.com",
                                       "phone": "+1", "answers": _answers()}).json()["session_id"]
    body = c.post("/api/invite", json={"session_id": sid}).json()
    assert body["token"] and body["return_token"]
    assert body["token"] != body["return_token"]


def test_the_friend_never_sees_the_return_token():
    c = client()
    tok = c.post("/api/answers", json={"name": "Ana", "email": "a@x.com",
                                       "phone": "+1", "answers": _answers()}).json()["share_token"]
    blob = json.dumps(c.get(f"/api/invite/{tok}").json())
    assert "return_token" not in blob
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/weft_core && pytest tests/test_api.py -v -k "return_token or both_tokens"`
Expected: FAIL — `KeyError: 'return_token'`

- [ ] **Step 3: Write minimal implementation**

In `weft/api.py`, change `_issue_invite` to mint both and return the pair:

```python
    def _issue_invite(session_id: str) -> tuple[str, str]:
        """Mint a share token for a session, plus the sender's own way back.
        Sharing is the whole point, so a link is created the moment a session
        exists. The return token is minted here so the two always exist
        together, and is never handed to whoever opens the share link."""
        tok, ret = app.state.new_token(), app.state.new_token()
        created = clock()
        store.add_invite(Invite(
            token=tok, return_token=ret, from_session_id=session_id, created_at=created,
            expires_at=_plus_days(created, settings.invite_ttl_days)))
        return tok, ret
```

At the `post_answers` assembly (currently line 151), unpack both:

```python
        share, ret = _issue_invite(sid)
        out = {"session_id": sid, "share_token": share, "return_token": ret}
```

In the responder branch, record which invite produced the pair:

```python
        pid = app.state.new_token()
        store.add_pair(Pair(id=pid, session_a=sender.id, session_b=sid,
                            created_at=clock(), invite_token=body.invite_token))
```

In `post_invite`:

```python
    @app.post("/api/invite")
    def post_invite(body: InviteIn):
        if store.get_session(body.session_id) is None:
            raise HTTPException(404, "unknown session")
        tok, ret = _issue_invite(body.session_id)
        return {"token": tok, "return_token": ret}
```

Leave `get_invite` untouched — it must keep returning only `from_name`, `question_set`, and `questions`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/weft_core && pytest tests/ -v`
Expected: PASS, whole suite. Other tests call `_issue_invite` indirectly, so a missed call site shows up here.

- [ ] **Step 5: Commit**

```bash
cd /Users/shearytan/Documents/SurnX/weft_core
git add weft/api.py tests/test_api.py
git commit -m "feat(api): mint a sender return token alongside every invite"
```

---

## Task 4: `GET /api/thread/{return_token}`

**Files:**
- Modify: `weft_core/weft/api.py` (add after `get_session_pairs`, around line 199)
- Test: `weft_core/tests/test_api.py`

**Interfaces:**
- Consumes: `get_invite_by_return_token`, `list_pairs_for_invite`, `_pair_body`.
- Produces: `GET /api/thread/{return_token}` → `{"pairs": [{"pair_id": str, ...}]}`, newest first. 404 on unknown token.

- [ ] **Step 1: Write the failing test**

Append to `weft_core/tests/test_api.py`:

```python
def test_thread_is_empty_until_someone_answers():
    c = client()
    ret = c.post("/api/answers", json={"name": "Ana", "email": "a@x.com",
                                       "phone": "+1", "answers": _answers()}).json()["return_token"]
    r = c.get(f"/api/thread/{ret}")
    assert r.status_code == 200
    assert r.json() == {"pairs": []}


def test_thread_shows_the_pair_that_invite_produced():
    c = client()
    sender = c.post("/api/answers", json={"name": "Ana", "email": "a@x.com",
                                          "phone": "+1", "answers": _answers()}).json()
    pid = c.post("/api/answers", json={"name": "Ben", "email": "b@x.com", "phone": "+1",
                                       "answers": _answers(),
                                       "invite_token": sender["share_token"]}).json()["pair_id"]

    body = c.get(f"/api/thread/{sender['return_token']}").json()
    assert [p["pair_id"] for p in body["pairs"]] == [pid]
    # Same shape as the single-pair view, so the frontend reuses one validator.
    one = body["pairs"][0]
    for key in ("headline", "score", "percent", "band", "shared_values", "difference", "people"):
        assert key in one


def test_thread_rejects_an_unknown_token():
    assert client().get("/api/thread/nope").status_code == 404


def test_thread_does_not_answer_to_the_share_token():
    c = client()
    sender = c.post("/api/answers", json={"name": "Ana", "email": "a@x.com",
                                          "phone": "+1", "answers": _answers()}).json()
    assert c.get(f"/api/thread/{sender['share_token']}").status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/weft_core && pytest tests/test_api.py -v -k thread`
Expected: FAIL — 404 for every case, because the route does not exist.

- [ ] **Step 3: Write minimal implementation**

In `weft/api.py`, after `get_session_pairs`:

```python
    @app.get("/api/thread/{return_token}")
    def get_thread(return_token: str):
        """The sender's own way back to what one invitation produced. Scoped to
        the invite rather than the session, so the link exposes that pairing
        and not every match the sender has. No expiry check: the invite stops
        accepting answers after its TTL, but the result stays reachable."""
        inv = store.get_invite_by_return_token(return_token)
        if inv is None:
            raise HTTPException(404, "unknown thread")
        return {"pairs": [{"pair_id": p.id, **_pair_body(p)}
                          for p in store.list_pairs_for_invite(inv.token)]}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/weft_core && pytest tests/ -v`
Expected: PASS, whole suite.

- [ ] **Step 5: Commit and open the backend PR**

```bash
cd /Users/shearytan/Documents/SurnX/weft_core
git add weft/api.py tests/test_api.py
git commit -m "feat(api): serve a sender's thread by return token"
git push -u origin feat/sender-return-link
```

Merge this branch before starting Task 5. The frontend tasks assume the endpoint exists.

---

## Task 5: `threadHref` in the links module

**Files:**
- Modify: `web-frontend/lib/links.ts`
- Test: `web-frontend/lib/links.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `threadHref(returnToken: string): string` → `/match/thread/<encoded token>`.

- [ ] **Step 1: Write the failing test**

Append to `web-frontend/lib/links.test.ts`, following the file's existing style:

```typescript
test("threadHref points at the sender's own thread", () => {
  expect(threadHref("in-1")).toBe("/match/thread/in-1");
});

test("threadHref encodes a token that would otherwise change the path", () => {
  expect(threadHref("a/b?c")).toBe("/match/thread/a%2Fb%3Fc");
});
```

Add `threadHref` to the existing import from `./links`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test lib/links.test.ts`
Expected: FAIL — `threadHref is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib/links.ts`, beside the existing bases:

```typescript
const THREAD_BASE = "/match/thread";
```

```typescript
/**
 * Where the sender comes back to. Scoped to one invite, so it shows what that
 * invitation produced rather than every match they belong to -- and it is a
 * different secret from the invite token, so forwarding the invite does not
 * hand this over.
 */
export function threadHref(returnToken: string): string {
  return `${THREAD_BASE}/${encodeURIComponent(returnToken)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test lib/links.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend
git add lib/links.ts lib/links.test.ts
git commit -m "feat(match): add the sender thread href"
```

---

## Task 6: Carry `return_token` through the submit boundary

**Files:**
- Modify: `web-frontend/lib/weftTypes.ts`, `web-frontend/lib/server/submitAnswers.ts:5-9` and `:49-55`
- Test: `web-frontend/lib/server/submitAnswers.test.ts`

**Interfaces:**
- Consumes: `POST /api/answers` returning `return_token` (Task 3).
- Produces: `ClientAnswers` gains `return_token: string`. The browser receives it; the session id stays server-side as before.

- [ ] **Step 1: Write the failing test**

Append to `web-frontend/lib/server/submitAnswers.test.ts`, matching the stub idiom already in that file:

```typescript
test("the return token reaches the browser", async () => {
  const outcome = await submitAnswers(
    { name: "Ana", email: "a@x.com", phone: "+1", answers: { Q1: 0 } },
    stub(200, {
      session_id: "s1",
      share_token: "out-1",
      return_token: "in-1",
      role: "originator",
    }),
  );

  expect(outcome.ok).toBe(true);
  if (!outcome.ok) return;
  expect(outcome.body.return_token).toBe("in-1");
  // The session id is still never handed to the browser.
  expect(JSON.stringify(outcome.body)).not.toContain("s1");
});

test("a response without a return token is not trusted", async () => {
  const outcome = await submitAnswers(
    { name: "Ana", email: "a@x.com", phone: "+1", answers: { Q1: 0 } },
    stub(200, { session_id: "s1", share_token: "out-1", role: "originator" }),
  );
  expect(outcome.ok).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test lib/server/submitAnswers.test.ts`
Expected: FAIL — `return_token` is undefined on the body.

- [ ] **Step 3: Write minimal implementation**

In `lib/weftTypes.ts`, add `return_token: string` to `AnswersResponse`.

In `lib/server/submitAnswers.ts`, extend `ClientAnswers`:

```typescript
export type ClientAnswers = {
  role: "originator" | "responder";
  share_token: string;
  /** The sender's way back, independent of the session cookie. */
  return_token: string;
  pair_id?: string;
};
```

Extend `isAnswersResponse` to require it:

```typescript
  const { role, session_id: sid, share_token: tok, return_token: ret,
          pair_id: pid } = value as Record<string, unknown>;
  if (typeof sid !== "string" || typeof tok !== "string") return false;
  if (typeof ret !== "string") return false;
```

Then include `return_token` wherever the function currently builds the `ClientAnswers` body from the upstream response, alongside `share_token`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test`
Expected: PASS, whole suite. Existing submit tests use fixtures without `return_token` and will now fail validation — update those fixtures to include it.

- [ ] **Step 5: Commit**

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend
git add lib/weftTypes.ts lib/server/submitAnswers.ts lib/server/submitAnswers.test.ts
git commit -m "feat(match): carry the return token through the submit boundary"
```

---

## Task 7: `loadThread`

**Files:**
- Create: `web-frontend/lib/server/thread.ts`
- Test: `web-frontend/lib/server/thread.test.ts`

**Interfaces:**
- Consumes: `GET /api/thread/{return_token}` (Task 4); `isPairSummary` from `lib/server/myPairs`.
- Produces: `ThreadOutcome = {status:"ok"; pairs: PairSummary[]} | {status:"not_found"} | {status:"unavailable"}`; `loadThread(returnToken: string | null, fetchImpl?: typeof fetch): Promise<ThreadOutcome>`.

- [ ] **Step 1: Write the failing test**

Create `web-frontend/lib/server/thread.test.ts`. Copy the `VALUE` / `PERSON` / `SUMMARY` fixtures and the `stub` helper verbatim from `lib/server/myPairs.test.ts` — the engineer may be reading this task in isolation, and those fixtures define the exact shape the validator accepts.

```typescript
import { expect, test } from "bun:test";
import { loadThread } from "./thread";

// VALUE, PERSON, SUMMARY and stub() copied from myPairs.test.ts

test("an empty thread is a result, not an error", async () => {
  const outcome = await loadThread("in-1", stub(200, { pairs: [] }));
  expect(outcome).toEqual({ status: "ok", pairs: [] });
});

test("a thread with a pair comes back whole", async () => {
  const outcome = await loadThread("in-1", stub(200, { pairs: [SUMMARY] }));
  expect(outcome).toEqual({ status: "ok", pairs: [SUMMARY] });
});

test("an unknown token is not_found", async () => {
  const outcome = await loadThread("in-1", stub(404, { detail: "unknown thread" }));
  expect(outcome.status).toBe("not_found");
});

test("an outage is unavailable", async () => {
  const outcome = await loadThread("in-1", stub(503, {}));
  expect(outcome.status).toBe("unavailable");
});

test("a missing token never reaches the backend", async () => {
  const outcome = await loadThread(null, stub(200, { pairs: [] }));
  expect(outcome.status).toBe("not_found");
});

test("one unrenderable pair sinks the response rather than vanishing", async () => {
  const broken = { ...SUMMARY, percent: 140 };
  const outcome = await loadThread("in-1", stub(200, { pairs: [SUMMARY, broken] }));
  expect(outcome.status).toBe("unavailable");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test lib/server/thread.test.ts`
Expected: FAIL — cannot resolve `./thread`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/server/thread.ts`:

```typescript
import { isPairSummary } from "@/lib/server/myPairs";
import { weftFetch } from "@/lib/server/weftApi";
import type { PairSummary } from "@/lib/weftTypes";

/**
 * What the sender's thread page can be. An empty list is `ok`, not an error:
 * "nobody has answered yet" is the expected state for a link saved the moment
 * it was created.
 */
export type ThreadOutcome =
  | { status: "ok"; pairs: PairSummary[] }
  | { status: "not_found" }
  | { status: "unavailable" };

/** Matches lib/server/pair.ts. Nothing near this cap is a real token. */
const MAX_TOKEN_LENGTH = 128;

/**
 * Every pair one invitation produced, newest first. The token is passed in
 * rather than read here: the page owns the params read, which keeps this
 * unit-testable without a request context.
 */
export async function loadThread(
  returnToken: string | null,
  fetchImpl?: typeof fetch,
): Promise<ThreadOutcome> {
  if (!returnToken || returnToken.length > MAX_TOKEN_LENGTH) return { status: "not_found" };

  const result = await weftFetch<unknown>(
    `/api/thread/${encodeURIComponent(returnToken)}`,
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
    console.error("weft_core returned an unrenderable thread");
    return { status: "unavailable" };
  }

  return { status: "ok", pairs };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test lib/server/thread.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend
git add lib/server/thread.ts lib/server/thread.test.ts
git commit -m "feat(match): load a sender thread by return token"
```

---

## Task 8: The thread page

**Files:**
- Create: `web-frontend/app/match/thread/[token]/page.tsx`
- Create: `web-frontend/app/match/thread/[token]/page.test.tsx`
- Modify: `web-frontend/content.ts` (add `compatibilityTest.thread`)

**Interfaces:**
- Consumes: `loadThread`, `ThreadOutcome` (Task 7); `pairHref` from `lib/links`.
- Produces: the route `/match/thread/<token>`; `ThreadScreen({ outcome }: { outcome: ThreadOutcome })` exported for tests.

- [ ] **Step 1: Write the failing test**

Create `app/match/thread/[token]/page.test.tsx`, following `app/match/matches/page.test.tsx`:

```typescript
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ThreadScreen } from "./page";
import { content } from "@/content";

const VALUE = { key: "BE", name: "Benevolence", tagline: "t", blurb: "b" };
const PERSON = {
  name: "Ana", top_values: [VALUE], humour: "warm/affiliative",
  opens_up: "opens up quickly", pace: "steady", life_stage: "rooting",
};
const SUMMARY = {
  pair_id: "p1", headline: "Ana and Ben.", score: 0.5, percent: 52, band: "A mix.",
  shared_values: [VALUE], difference: "humour",
  people: [PERSON, { ...PERSON, name: "Ben" }],
};

test("a thread nobody has answered says so and does not apologise", () => {
  const html = renderToStaticMarkup(<ThreadScreen outcome={{ status: "ok", pairs: [] }} />);
  expect(html).toContain(content.compatibilityTest.thread.waiting.headline);
});

test("an unknown token says the link is not recognised", () => {
  const html = renderToStaticMarkup(<ThreadScreen outcome={{ status: "not_found" }} />);
  expect(html).toContain(content.compatibilityTest.thread.unknown.headline);
});

test("an outage offers a retry rather than a dead end", () => {
  const html = renderToStaticMarkup(<ThreadScreen outcome={{ status: "unavailable" }} />);
  expect(html).toContain(content.compatibilityTest.thread.unavailable.headline);
});

test("several pairs render as a list", () => {
  const html = renderToStaticMarkup(
    <ThreadScreen outcome={{ status: "ok", pairs: [SUMMARY, { ...SUMMARY, pair_id: "p2" }] }} />,
  );
  expect(html).toContain("/match/pair/p1");
  expect(html).toContain("/match/pair/p2");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test app/match/thread`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Write minimal implementation**

Add to `content.ts` under `compatibilityTest`:

```typescript
    thread: {
      waiting: {
        eyebrow: "Your thread",
        headline: "No one has answered yet.",
        body: "The moment someone opens your link and answers, their result appears here. Keep this page — it works even if you clear your cookies or switch phones.",
      },
      unknown: {
        eyebrow: "Not found",
        headline: "We don't recognise this link.",
        body: "Check you copied the whole thing. If it was a link you saved, it may have been from a different browser.",
        cta: "Take the test",
      },
      unavailable: {
        eyebrow: "Not right now",
        headline: "We can't reach your thread.",
        body: "Something on our side is down. Your result is safe — try again in a moment.",
      },
    },
```

Create `app/match/thread/[token]/page.tsx`:

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompatibilityNotice } from "@/components/compatibility/CompatibilityNotice";
import { MatchesView } from "@/components/compatibility/MatchesView";
import { content } from "@/content";
import { pairHref } from "@/lib/links";
import { loadThread, type ThreadOutcome } from "@/lib/server/thread";

export const metadata: Metadata = {
  title: "Weft: Your thread",
  // A return link is a capability: whoever holds it sees the result. Indexing
  // one would hand it to everyone.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Split from the page so each state renders in a test without a request
 * context. A single pair redirects rather than rendering: one canonical
 * result URL beats a second view of the same data that could drift from it.
 */
export function ThreadScreen({ outcome }: { outcome: ThreadOutcome }) {
  const copy = content.compatibilityTest.thread;

  if (outcome.status === "not_found") {
    return (
      <CompatibilityNotice
        eyebrow={copy.unknown.eyebrow}
        headline={copy.unknown.headline}
        body={copy.unknown.body}
        cta={{ href: "/match", label: copy.unknown.cta }}
      />
    );
  }

  if (outcome.status === "unavailable") {
    return (
      <CompatibilityNotice
        eyebrow={copy.unavailable.eyebrow}
        headline={copy.unavailable.headline}
        body={copy.unavailable.body}
      />
    );
  }

  if (outcome.pairs.length === 0) {
    return (
      <CompatibilityNotice
        eyebrow={copy.waiting.eyebrow}
        headline={copy.waiting.headline}
        body={copy.waiting.body}
      />
    );
  }

  return <MatchesView pairs={outcome.pairs} />;
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const outcome = await loadThread(token);

  if (outcome.status === "ok" && outcome.pairs.length === 1) {
    redirect(pairHref(outcome.pairs[0].pair_id));
  }

  return (
    <main id="main-content">
      <ThreadScreen outcome={outcome} />
    </main>
  );
}
```

`MatchesView` is `({ pairs }: { pairs: PairSummary[] })`, and each card renders `pairHref(pair.pair_id)` via `MatchCard.tsx:20` — which is why the Step 1 test asserts on `/match/pair/p1`. No change is needed to either component.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test app/match/thread && npx tsc --noEmit`
Expected: tests PASS; `tsc` reports only the three pre-existing `CompatibilityTest.interaction.test.ts` errors and nothing new.

- [ ] **Step 5: Commit**

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend
git add app/match/thread content.ts
git commit -m "feat(match): add the sender thread page"
```

---

## Task 9: Offer the link on the share screen, and correct the false copy

**Files:**
- Modify: `web-frontend/lib/submitOutcome.ts:8-9`, `:21`, `:28-31`
- Modify: `web-frontend/components/compatibility/CompatibilityTest.tsx:64`, `:125`, `:177`, `:200`, `:380`
- Modify: `web-frontend/components/compatibility/ShareScreen.tsx:11-17`
- Modify: `web-frontend/content.ts` (`compatibilityTest.share`)
- Test: `web-frontend/components/compatibility/ShareScreen.test.tsx`, `web-frontend/lib/submitOutcome.test.ts`

**Interfaces:**
- Consumes: `threadHref` (Task 5); `return_token` on the submit response (Task 6).
- Produces: `ShareScreen({ shareToken, returnToken, onRestart }: { shareToken: string; returnToken: string | null; onRestart: () => void })`. `SubmitOutcome`'s `share` phase becomes `{ phase: "share"; token: string; returnToken: string }`.

The token reaches the component through four hops — route response → `submitOutcome.ts` → `CompatibilityTest` state → `ShareScreen` prop. All four must change or the affordance renders with nothing to link to.

- [ ] **Step 1: Write the failing test**

Append to `components/compatibility/ShareScreen.test.tsx`, following the file's existing render idiom:

```typescript
test("the sender is offered their own link, below the invite", () => {
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="out-1" returnToken="in-1" onRestart={() => {}} />,
  );
  expect(html).toContain("/match/thread/in-1");
  // The invite is still the primary action: it appears first.
  expect(html.indexOf("/match/invite/out-1")).toBeLessThan(html.indexOf("/match/thread/in-1"));
});

test("no return link is offered when there is no token", () => {
  const html = renderToStaticMarkup(
    <ShareScreen shareToken="out-1" returnToken={null} onRestart={() => {}} />,
  );
  expect(html).not.toContain("/match/thread/");
});

test("the share copy no longer claims the invite is how you come back", () => {
  expect(content.compatibilityTest.share.note).not.toContain("come back");
});
```

`ShareScreen` currently takes exactly `{ shareToken: string; onRestart: () => void }`, so `returnToken` is the only addition; the calls above are complete.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test components/compatibility/ShareScreen.test.tsx`
Expected: FAIL — no `/match/thread/` in the markup.

- [ ] **Step 3: Write minimal implementation**

In `content.ts`, replace the false line in `compatibilityTest.share`. The current `note` reads "Keep this link. It's also how you come back to see your match." — that is wrong, because the share link renders the questionnaire. Replace with:

```typescript
      note: "Send this link to one person. Opening it starts the questions for them.",
      returnLink: "Save your own link",
      returnHint: "Opens your result when they answer. Keep it — it works without cookies, on any device.",
```

In `ShareScreen.tsx`, accept the token and render the affordance *after* the existing invite link and note, so the invite stays the one obvious action:

```typescript
      {returnToken ? (
        <a
          className="mt-6 font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
          href={threadHref(returnToken)}
        >
          {copy.returnLink}
        </a>
      ) : null}
```

Change the props at `ShareScreen.tsx:11-17` and import `threadHref` from `@/lib/links`:

```typescript
export function ShareScreen({
  shareToken,
  returnToken,
  onRestart,
}: {
  shareToken: string;
  returnToken: string | null;
  onRestart: () => void;
}) {
```

Then thread the value back through the three hops that feed it.

`lib/submitOutcome.ts` — widen the accepted body at line 21 and carry the token on the `share` phase:

```typescript
  body: { share_token?: string; return_token?: string; pair_id?: string; error?: string } | null,
```

```typescript
  if (ok && body?.share_token) {
    return { phase: "share", token: body.share_token, returnToken: body.return_token ?? "" };
  }
```

and update the `share` variant in the `SubmitOutcome` union to `{ phase: "share"; token: string; returnToken: string }`. The `?? ""` keeps an older backend from throwing; the empty string then suppresses the affordance rather than rendering a broken link.

`components/compatibility/CompatibilityTest.tsx` — add state beside `shareToken` at line 64:

```typescript
  const [returnToken, setReturnToken] = useState("");
```

Clear it wherever `setShareToken("")` resets at line 125, extend the inline response type at line 177 with `return_token?: string`, set it beside `setShareToken(outcome.token)` at line 200:

```typescript
        setReturnToken(outcome.returnToken);
```

and pass it at line 380:

```typescript
            <ShareScreen shareToken={shareToken} returnToken={returnToken || null} onRestart={reset} />
```

The `|| null` matters: empty-string state before submit must read as "no link yet", which is the same branch the component uses to render nothing.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/shearytan/Documents/SurnX/web-frontend && bun test && npx tsc --noEmit`
Expected: tests PASS, whole suite; `tsc` clean apart from the three pre-existing errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend
git add components/compatibility/ShareScreen.tsx components/compatibility/ShareScreen.test.tsx content.ts
git commit -m "feat(match): offer the sender their return link on the share screen"
```

---

## Task 10: End-to-end verification with the cookie discarded

**Files:** none — this task only runs the system.

**Interfaces:**
- Consumes: everything above.
- Produces: evidence the feature does the one thing it exists for.

Unit tests cannot prove this. They all pass against a return link that silently falls back to the cookie. Only discarding the cookie does.

- [ ] **Step 1: Start both services**

```bash
cd /Users/shearytan/Documents/SurnX/weft_core && uvicorn weft.api:app --port 8001 &
cd /Users/shearytan/Documents/SurnX/web-frontend && npx next build && \
  WEFT_API_URL=http://localhost:8001 \
  WEFT_PROXY_KEY=$(grep '^WEFT_PROXY_KEY=' /Users/shearytan/Documents/SurnX/weft_core/.env | cut -d= -f2-) \
  npx next start -p 3100 &
```

- [ ] **Step 2: Sender submits and keeps only the return token**

```bash
KEY=$(grep '^WEFT_PROXY_KEY=' /Users/shearytan/Documents/SurnX/weft_core/.env | cut -d= -f2-)
curl -s -H "X-Weft-Proxy-Key: $KEY" http://localhost:8001/api/bank > /tmp/bank.json
python3 -c "
import json
qs=json.load(open('/tmp/bank.json'))['questions']
a={q['id']:([0,1] if q['kind']=='pick2' else 0) for q in qs}
json.dump({'name':'Ana','email':'a@x.com','phone':'+1','answers':a},open('/tmp/a.json','w'))"
R=$(curl -s -c /tmp/jarA.txt -X POST http://localhost:3100/api/answers \
     -H "Content-Type: application/json" -d @/tmp/a.json)
echo "$R"
```

Expected: JSON containing `share_token` **and** `return_token`, and no `session_id`.

- [ ] **Step 3: Discard the sender's cookie entirely**

```bash
rm -f /tmp/jarA.txt
```

This is the step that matters. From here the sender has only the return token.

- [ ] **Step 4: Confirm the thread waits, then resolves**

```bash
RET=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['return_token'])")
TOK=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['share_token'])")

# No cookie at all -- the waiting state
curl -s "http://localhost:3100/match/thread/$RET" | grep -o "No one has answered yet" || echo "WAITING STATE MISSING"

# A different person answers, in their own jar
python3 -c "
import json
qs=json.load(open('/tmp/bank.json'))['questions']
a={q['id']:([0,2] if q['kind']=='pick2' else 1) for q in qs}
json.dump({'name':'Ben','email':'b@x.com','phone':'+1','answers':a,'invite_token':'$TOK'},open('/tmp/b.json','w'))"
curl -s -c /tmp/jarB.txt -X POST http://localhost:3100/api/answers \
  -H "Content-Type: application/json" -d @/tmp/b.json

# Sender returns with NO cookie and follows the redirect
curl -s -L "http://localhost:3100/match/thread/$RET" | grep -o 'ctest-result-score-number"[^>]*>[0-9]*'
```

Expected: the waiting state before, and a score after — with no cookie jar present on either request.

- [ ] **Step 5: Confirm the friend cannot reach the sender's thread**

```bash
curl -s -o /dev/null -w "share token as thread: %{http_code}\n" "http://localhost:3100/match/thread/$TOK"
```

Expected: the not-found state, not the result. The invite token must never resolve as a return token.

- [ ] **Step 6: Stop the services and record the result**

```bash
for p in 3100 8001; do lsof -nP -iTCP:$p -sTCP:LISTEN -t | xargs kill 2>/dev/null; done
```

Report each expectation as met or not met. If Step 4 shows a score only when a cookie jar is present, the feature does not work regardless of what the unit tests say.

---

## Verification summary

- `cd weft_core && pytest tests/ -v` — whole suite green
- `cd web-frontend && bun test` — whole suite green
- `cd web-frontend && npx tsc --noEmit` — no errors beyond the three pre-existing `CompatibilityTest.interaction.test.ts` failures
- `cd web-frontend && npx next build` — clean, route table shows `/match/thread/[token]`
- Task 10 — the cookie-discarded path, which is the only check that proves the feature
