# Weft Integration — Phase 0: Backend Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the `weft_core` FastAPI contract so the Next.js BFF can drive the full two-person compatibility flow: one submission endpoint for both roles, profiles only inside pair results, invites that carry their own questions, and shared-secret auth.

**Architecture:** `POST /api/answers` replaces both `POST /api/session` and `POST /api/invite/{token}/answer`; the optional `invite_token` attribute selects originator vs responder and shapes the response. `own_read` stops being returned anywhere; the per-person descriptive fields move into `pair_result` so a profile is only ever seen alongside a compatibility result. A shared `X-Weft-Proxy-Key` header gates every endpoint.

**Tech Stack:** Python 3.10+, FastAPI, Pydantic, pytest, numpy. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-25-weft-backend-frontend-integration-design.md` (in the `web-frontend` repo)

**Repo for this phase:** `/Users/shearytan/documents/surnx/weft_core`

## Global Constraints

- **Repo:** all work in `/Users/shearytan/documents/surnx/weft_core`, on a new branch `feat/bff-contract` cut from `main`. Never commit to `main`.
- **Python 3.10+.** No new dependencies — FastAPI, Pydantic, numpy, pytest only.
- **Tests stay database-free and fast.** The default suite runs on `InMemoryStorage` and must not require `DATABASE_URL`.
- **Scores never leave the server.** Anything crossing to a client goes through `public_bank()` / the report wording functions. No raw loadings, no raw answers, no numeric compatibility scores in any response.
- **The dependency rule holds:** `trivia_engine`, `friendship_core`, and `report` import nothing from `api` or storage.
- **This is a breaking contract change.** `POST /api/session` and `POST /api/invite/{token}/answer` are removed, not deprecated. Their tests are rewritten, not kept passing.
- **Exit gate:** this phase ends at Task 6. Stop, report, and wait for explicit approval before starting Phase 1.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `weft/config.py` | Settings from environment | Add `proxy_key` |
| `weft/api.py` | FastAPI wiring, endpoints, auth | Add auth dependency; unify answer endpoints; enrich invite payload |
| `weft/report.py` | Score → words | Add `_person_entry`; enrich `pair_result` people |
| `tests/test_config.py` | Config unit tests | Add proxy-key cases |
| `tests/test_api.py` | Endpoint contract tests | Rewrite session/friend-answer tests around `/api/answers`; add auth tests |
| `tests/test_result_text.py` | Report wording tests | Add fuller-read assertions |
| `README.md` | Endpoint + config docs | Update endpoint table and config table |
| `.env.example` | Documented env vars | Add `WEFT_PROXY_KEY` |

---

### Task 1: Branch and proxy-key setting

**Files:**
- Modify: `weft/config.py`
- Test: `tests/test_config.py`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `settings.proxy_key: str | None` — read from `WEFT_PROXY_KEY`, `None` when unset. Task 2 depends on this exact attribute name and the `None`-when-unset behaviour.

- [ ] **Step 1: Create the branch**

```bash
cd /Users/shearytan/documents/surnx/weft_core
git checkout main
git checkout -b feat/bff-contract
git status
```

Expected: `On branch feat/bff-contract`, working tree clean apart from any pre-existing untracked files.

- [ ] **Step 2: Write the failing tests**

In `tests/test_config.py`, add `"WEFT_PROXY_KEY"` to the `_KEYS` tuple so the defaults test clears it, and add two tests at the end of the file:

```python
def test_proxy_key_defaults_to_none(monkeypatch):
    monkeypatch.delenv("WEFT_PROXY_KEY", raising=False)
    assert load_settings().proxy_key is None


def test_proxy_key_reads_env(monkeypatch):
    monkeypatch.setenv("WEFT_PROXY_KEY", "s3cret")
    assert load_settings().proxy_key == "s3cret"
```

Also update the existing `_KEYS` tuple to:

```python
_KEYS = ("WEFT_ALLOWED_ORIGINS", "WEFT_STORAGE", "WEFT_INVITE_TTL_DAYS",
         "DATABASE_URL", "WEFT_PROXY_KEY")
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `python -m pytest tests/test_config.py -v`
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'proxy_key'`

- [ ] **Step 4: Add the setting**

In `weft/config.py`, add the field to the `Settings` dataclass (last field, so existing positional construction is unaffected):

```python
@dataclass(frozen=True)
class Settings:
    allowed_origins: list[str]
    storage_backend: str      # "memory" | "postgres"
    invite_ttl_days: int
    database_url: str | None  # Postgres connection string (Neon gives you one)
    proxy_key: str | None     # shared secret the BFF must send; None disables the check
```

And in `load_settings()`, add the final keyword argument:

```python
        database_url=os.environ.get("DATABASE_URL") or None,
        proxy_key=os.environ.get("WEFT_PROXY_KEY") or None,
    )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m pytest tests/test_config.py -v`
Expected: PASS (all config tests, including the two new ones)

- [ ] **Step 6: Commit**

```bash
git add weft/config.py tests/test_config.py
git commit -m "feat: add WEFT_PROXY_KEY setting"
```

---

### Task 2: Shared-secret auth on every endpoint

**Files:**
- Modify: `weft/api.py`
- Test: `tests/test_api.py`

**Interfaces:**
- Consumes: `settings.proxy_key` from Task 1.
- Produces: every endpoint requires header `X-Weft-Proxy-Key` when `settings.proxy_key` is set; returns 401 otherwise. When `proxy_key` is `None` (local dev, existing tests) no check runs. Tasks 3–5 rely on this being transparent for the default test client.

**Why a dependency and not middleware:** FastAPI dependencies run inside the routing layer, so the 401 is returned before any handler touches storage, and it composes with the existing `create_app` factory without a second middleware ordering concern.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_api.py`:

```python
def test_requests_pass_when_no_proxy_key_is_configured(monkeypatch):
    # Local dev and the default suite run without a key -- nothing to enforce.
    monkeypatch.setattr("weft.api.settings.proxy_key", None, raising=False)
    assert client().get("/api/bank").status_code == 200


def test_missing_proxy_key_is_401_when_configured(monkeypatch):
    monkeypatch.setattr("weft.api.settings.proxy_key", "s3cret", raising=False)
    assert client().get("/api/bank").status_code == 401


def test_wrong_proxy_key_is_401(monkeypatch):
    monkeypatch.setattr("weft.api.settings.proxy_key", "s3cret", raising=False)
    r = client().get("/api/bank", headers={"X-Weft-Proxy-Key": "nope"})
    assert r.status_code == 401


def test_correct_proxy_key_is_accepted(monkeypatch):
    monkeypatch.setattr("weft.api.settings.proxy_key", "s3cret", raising=False)
    r = client().get("/api/bank", headers={"X-Weft-Proxy-Key": "s3cret"})
    assert r.status_code == 200
```

`settings` is a frozen dataclass, so `monkeypatch.setattr` targets the imported
module attribute path `weft.api.settings.proxy_key` with `raising=False`. This
works because the dependency reads `settings.proxy_key` at request time, not at
import time — keep it that way.

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_api.py -k proxy_key -v`
Expected: FAIL — the 401 tests get `200` because no check exists yet.

- [ ] **Step 3: Implement the auth dependency**

In `weft/api.py`, add `Depends` and `Header` to the FastAPI import:

```python
from fastapi import FastAPI, HTTPException, Depends, Header
```

Add the dependency at module level, after the `_require_complete` helper:

```python
def _require_proxy_key(x_weft_proxy_key: str | None = Header(default=None)):
    """The BFF is the only client. When a key is configured every request must
    carry it, so an internet caller is rejected before touching storage.
    Unset means no check -- local runs and the default test suite need no key.
    Compared with compare_digest so a wrong key cannot be timed out character
    by character."""
    expected = settings.proxy_key
    if not expected:
        return
    if not x_weft_proxy_key or not secrets.compare_digest(x_weft_proxy_key, expected):
        raise HTTPException(401, "missing or invalid proxy key")
```

Then apply it to the whole app inside `create_app`, replacing the `app = FastAPI(...)` line:

```python
    app = FastAPI(title="Weft API", dependencies=[Depends(_require_proxy_key)])
```

`secrets` is already imported at the top of the file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_api.py -k proxy_key -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the whole suite for regressions**

Run: `python -m pytest tests/ -q`
Expected: PASS — the existing tests configure no proxy key, so the check is inert.

- [ ] **Step 6: Commit**

```bash
git add weft/api.py tests/test_api.py
git commit -m "feat: gate every endpoint behind the BFF proxy key"
```

---

### Task 3: Enrich `pair_result` people to the fuller read

**Files:**
- Modify: `weft/report.py`
- Test: `tests/test_result_text.py`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: each entry in `pair_result(...)["people"]` gains `humour`, `opens_up`, `pace`, `life_stage` alongside the existing `name` and `top_values`. Task 5's endpoint tests assert these fields.

**Why here and not in the API:** `report.py` already owns every user-visible sentence, and `own_read` computes exactly these fields. Building them in one shared helper keeps a person worded identically wherever they appear.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_result_text.py`:

```python
def test_pair_result_people_carry_the_fuller_read():
    """A profile is only ever shown inside a compatibility result, so the pair
    result must carry the descriptive fields the solo read used to."""
    # Build the set from the engine, not from weft.api -- a report test must not
    # reach into the API layer (dependencies point inward).
    from weft.report import pair_result
    from weft.trivia_engine import simulate, encode, balanced_set
    from weft.consistency import SHORT_QUIZ_LENGTH, CORE_REQUIRED
    from weft.adapter import to_core_person

    qset = balanced_set(SHORT_QUIZ_LENGTH, CORE_REQUIRED)
    ans_a = simulate(qset, {"BE": 3, "UN": 2}, seed=1)
    ans_b = simulate(qset, {"AC": 3, "PO": 2}, seed=2)
    prof_a, prof_b = encode(ans_a), encode(ans_b)
    pa = to_core_person(0, "Ana", prof_a)
    pb = to_core_person(1, "Ben", prof_b)

    res = pair_result(pa, prof_a, ans_a, pb, prof_b, ans_b)

    for person in res["people"]:
        assert set(person) == {"name", "top_values", "humour",
                               "opens_up", "pace", "life_stage"}
        assert person["name"]
        assert person["top_values"][0]["blurb"]
        assert person["opens_up"] and person["pace"] and person["life_stage"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_result_text.py::test_pair_result_people_carry_the_fuller_read -v`
Expected: FAIL — `AssertionError` because each person currently has only `{"name", "top_values"}`.

- [ ] **Step 3: Implement the shared person entry**

In `weft/report.py`, add this helper immediately **before** `def own_read(`:

```python
def _person_entry(name: str, profile: dict, top_values: list) -> dict:
    """One person as they appear inside a pair result: identity plus the same
    descriptive wording the solo read uses. No raw scores, no answers."""
    return {
        "name": name,
        "top_values": [_value_entry(v["key"]) for v in top_values],
        "humour": _tidy(profile["humor"]),
        "opens_up": _OPENS[_bucket(profile["vuln"])],
        "pace": _PACE[_bucket(profile["tempo"])],
        "life_stage": profile["lifestage"] or "unspecified",
    }
```

Then in `pair_result`, replace the `"people"` value in the returned dict:

```python
        "people": [
            _person_entry(a, profile_a, full["people"][0]["top_values"]),
            _person_entry(b, profile_b, full["people"][1]["top_values"]),
        ],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_result_text.py -v`
Expected: PASS

- [ ] **Step 5: Run the whole suite**

Run: `python -m pytest tests/ -q`
Expected: PASS. `test_pair_result_is_words_and_friend_safe` asserts on the **top-level** keys only, so adding fields inside `people[]` does not break it.

- [ ] **Step 6: Commit**

```bash
git add weft/report.py tests/test_result_text.py
git commit -m "feat: carry the fuller read inside pair results"
```

---

### Task 4: Invites carry their own questions

**Files:**
- Modify: `weft/api.py`
- Test: `tests/test_api.py`

**Interfaces:**
- Consumes: the auth dependency from Task 2 (transparent here).
- Produces: `GET /api/invite/{token}` returns `{from_name, question_set, questions}` where `questions` is `public_bank(sess.question_set)` — the same score-stripped shape as `GET /api/bank`. Phase 3's responder page renders directly from this.

**Why:** ids alone cannot be rendered. Returning the sender's actual questions also removes a drift class: if the bank changes between the two people answering, the responder still sees exactly what the sender answered.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_api.py`:

```python
def test_invite_view_carries_renderable_questions():
    """The friend renders from this payload alone -- ids are not enough."""
    c = client()
    sid = _make_session(c)
    tok = c.post("/api/invite", json={"session_id": sid}).json()["token"]

    body = c.get(f"/api/invite/{tok}").json()
    assert body["from_name"]
    assert [q["id"] for q in body["questions"]] == body["question_set"]
    for q in body["questions"]:
        assert q["prompt"] and q["options"]
    # still score-free
    blob = json.dumps(body)
    for key in ("scores", "SD", "BE", "Vuln"):
        assert f'"{key}"' not in blob
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_api.py::test_invite_view_carries_renderable_questions -v`
Expected: FAIL — `KeyError: 'questions'`

- [ ] **Step 3: Implement**

In `weft/api.py`, change the return of `get_invite`:

```python
        return {"from_name": sess.name, "question_set": sess.question_set,
                "questions": public_bank(sess.question_set)}
```

`public_bank` is already imported.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_api.py::test_invite_view_carries_renderable_questions -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add weft/api.py tests/test_api.py
git commit -m "feat: invite view returns renderable questions"
```

---

### Task 5: Unified `POST /api/answers`

**Files:**
- Modify: `weft/api.py`
- Test: `tests/test_api.py`

**Interfaces:**
- Consumes: `settings.proxy_key` auth (Task 2), the enriched `pair_result` (Task 3).
- Produces: the single submission endpoint the BFF calls.

```
POST /api/answers
body: {name, email, phone, answers, invite_token?}

originator (no invite_token) → 200 {role: "originator", session_id, share_token}
responder  (invite_token)    → 200 {role: "responder",  session_id, share_token, pair_id}
```

**`session_id` is returned in both branches** — the BFF needs it to set the `weft_session` cookie. **`share_token` is returned in both branches** — a responder must be able to invite others, or the referral chain dies at depth one.

`POST /api/session` and `POST /api/invite/{token}/answer` are **deleted**.

- [ ] **Step 1: Write the failing tests**

In `tests/test_api.py`, first replace the `_make_session` helper with one that
uses the new endpoint (later tasks and existing tests call it):

```python
def _make_session(c, name="Ana", lean=None, seed=1):
    from weft.api import QUIZ_SET
    from weft.trivia_engine import simulate
    r = c.post("/api/answers", json={
        "name": name, "email": f"{name.lower()}@x.com", "phone": "+15550000000",
        "answers": simulate(QUIZ_SET, lean or {"BE": 3, "UN": 2}, seed=seed)})
    assert r.status_code == 200, r.text
    return r.json()["session_id"]
```

Then **delete** these now-obsolete tests (they target removed endpoints):
`test_session_stores_and_returns_own_read`, `test_read_top_values_carry_a_blurb`,
`test_session_rejects_bad_answers`, `test_session_rejects_incomplete_answers`,
`test_friend_answer_rejects_incomplete_answers`, `test_session_requires_name_and_email`,
`test_session_rejects_missing_phone`, `test_session_stores_phone`,
`test_friend_answer_rejects_missing_phone`, `test_expired_invite_answer_is_410`,
`test_friend_answering_creates_a_pair`, `test_friend_answer_unknown_token_is_404`,
`test_session_returns_a_working_share_token`, `test_friend_answer_returns_a_working_share_token`,
`test_full_loop_two_people_to_a_result`.

Add their replacements:

```python
def _submit(c, name, lean, seed, token=None):
    """Submit as originator (no token) or responder (token).

    A bad or expired token still has to produce a real request, so the endpoint
    can answer 404/410 -- hence the fall back to the default set rather than
    reading question_set off an error body."""
    from weft.api import QUIZ_SET
    from weft.trivia_engine import simulate
    qset = list(QUIZ_SET)
    if token:
        r = c.get(f"/api/invite/{token}")
        if r.status_code == 200:
            qset = r.json()["question_set"]
    body = {"name": name, "email": f"{name.lower()}@x.com",
            "phone": "+15550000000", "answers": simulate(qset, lean, seed=seed)}
    if token:
        body["invite_token"] = token
    return c.post("/api/answers", json=body)


def test_originator_gets_a_session_and_share_token():
    r = _submit(client(), "Ana", {"BE": 3, "UN": 2}, 1)
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "originator"
    assert body["session_id"] and body["share_token"]
    assert "pair_id" not in body


def test_originator_response_carries_no_profile():
    """A profile is only ever shown next to a compatibility result."""
    body = _submit(client(), "Ana", {"BE": 3, "UN": 2}, 1).json()
    assert "read" not in body
    blob = json.dumps(body)
    assert "top_values" not in blob and "life_stage" not in blob


def test_responder_creates_a_pair_and_can_share_onward():
    c = client()
    sid = _make_session(c)
    tok = c.post("/api/invite", json={"session_id": sid}).json()["token"]
    body = _submit(c, "Ben", {"AC": 3, "PO": 2}, 2, token=tok).json()
    assert body["role"] == "responder"
    assert body["pair_id"] and body["session_id"]
    # the chain must not stop at depth one
    assert body["share_token"]
    assert c.get(f"/api/invite/{body['share_token']}").status_code == 200


def test_answers_rejects_blank_identity_fields():
    from weft.api import QUIZ_SET
    from weft.trivia_engine import simulate
    ans = simulate(QUIZ_SET, {"BE": 3}, seed=1)
    for missing in ("name", "email", "phone"):
        body = {"name": "Ana", "email": "a@x.com", "phone": "+15550000000",
                "answers": ans}
        body[missing] = "  "
        r = client().post("/api/answers", json=body)
        assert r.status_code == 400, f"{missing} should be required"


def test_answers_rejects_incomplete_submission():
    from weft.api import QUIZ_SET
    from weft.trivia_engine import simulate
    ans = simulate(QUIZ_SET, {"BE": 3}, seed=1)
    ans.pop(QUIZ_SET[0])
    r = client().post("/api/answers", json={
        "name": "Ana", "email": "a@x.com", "phone": "+15550000000", "answers": ans})
    assert r.status_code == 400
    assert "missing answers" in r.json()["detail"]


def test_answers_rejects_a_question_outside_the_served_set():
    from weft.api import QUIZ_SET
    from weft.trivia_engine import simulate
    ans = simulate(QUIZ_SET, {"BE": 3}, seed=1)
    ans["Q999"] = 0
    r = client().post("/api/answers", json={
        "name": "Ana", "email": "a@x.com", "phone": "+15550000000", "answers": ans})
    assert r.status_code == 400


def test_answers_with_unknown_invite_token_is_404():
    r = _submit(client(), "Ben", {"AC": 3}, 2, token="nope")
    assert r.status_code == 404


def test_answers_with_expired_invite_is_410():
    """Move the clock rather than counting clock() calls -- a mutable `now`
    survives any change to how many times a handler reads the time."""
    from weft.api import create_app
    from weft.storage import InMemoryStorage
    now = {"t": "2026-07-22T10:00:00Z"}
    c = TestClient(create_app(storage=InMemoryStorage(), now=lambda: now["t"]))
    sid = _make_session(c)
    tok = c.post("/api/invite", json={"session_id": sid}).json()["token"]
    now["t"] = "2026-09-30T10:00:00Z"          # past the 30-day invite TTL
    r = _submit(c, "Ben", {"AC": 3}, 2, token=tok)
    assert r.status_code == 410


def test_old_endpoints_are_gone():
    c = client()
    assert c.post("/api/session", json={}).status_code == 404
    assert c.post("/api/invite/anytoken/answer", json={}).status_code == 404


def test_full_loop_two_people_to_a_result():
    c = client()
    # 1. Ana answers -- she gets a link and nothing else
    ana = _submit(c, "Ana", {"BE": 3, "UN": 2}, 1).json()
    assert ana["role"] == "originator" and "pair_id" not in ana
    # 2. Ben opens her link and sees her questions
    invite = c.get(f"/api/invite/{ana['share_token']}").json()
    assert invite["from_name"] == "Ana" and invite["questions"]
    # 3. Ben answers -- the pair forms
    ben = _submit(c, "Ben", {"AC": 3, "PO": 2}, 2, token=ana["share_token"]).json()
    # 4. Both sides read the same friend-safe result, with both profiles
    result = c.get(f"/api/pair/{ben['pair_id']}").json()
    assert result["headline"] and result["band"] and result["difference"]
    assert {p["name"] for p in result["people"]} == {"Ana", "Ben"}
    assert all(p["life_stage"] for p in result["people"])
    # 5. Ana comes back and finds it
    pairs = c.get(f"/api/session/{ana['session_id']}/pairs").json()["pairs"]
    assert len(pairs) == 1 and pairs[0]["pair_id"] == ben["pair_id"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_api.py -q`
Expected: FAIL — `/api/answers` returns 404 (endpoint does not exist yet).

- [ ] **Step 3: Implement the unified endpoint**

In `weft/api.py`, replace the `SessionIn` model with:

```python
class AnswersIn(BaseModel):
    name: str
    email: str
    phone: str
    answers: dict
    invite_token: str | None = None
```

Delete the whole `post_session` and `post_friend_answer` handlers, and add in
their place:

```python
    @app.post("/api/answers")
    def post_answers(body: AnswersIn):
        """One submission endpoint for both roles. `invite_token` decides which:
        absent means this person is starting a chain; present means they are
        answering someone's invite, so a pair forms. Both roles get a share
        token -- a responder who cannot invite ends the chain at depth one."""
        if not body.name.strip() or not body.email.strip() or not body.phone.strip():
            raise HTTPException(400, "name, email and phone are required")

        sender = None
        if body.invite_token is not None:
            inv = store.get_invite(body.invite_token)
            if inv is None:
                raise HTTPException(404, "unknown invite")
            if _expired(inv.expires_at, clock()):
                raise HTTPException(410, "this invite has expired")
            sender = store.get_session(inv.from_session_id)

        # A responder answers the sender's set, so coverage matches on both sides.
        expected = sender.question_set if sender else list(QUIZ_SET)
        try:
            answers = validate_answers(body.answers, allowed=set(expected))
        except ValueError as e:
            raise HTTPException(400, str(e))
        _require_complete(answers, expected)

        sid = app.state.new_token()
        store.add_session(Session(
            id=sid, name=body.name.strip(), email=body.email.strip(),
            phone=body.phone.strip(), answers=answers,
            question_set=list(expected), created_at=clock()))

        out = {"session_id": sid, "share_token": _issue_invite(sid)}
        if sender is None:
            out["role"] = "originator"
            return out

        pid = app.state.new_token()
        store.add_pair(Pair(id=pid, session_a=sender.id, session_b=sid,
                            created_at=clock()))
        out["role"] = "responder"
        out["pair_id"] = pid
        return out
```

Finally, drop the now-unused import of `own_read` — change:

```python
from weft.report import own_read, pair_result
```

to:

```python
from weft.report import pair_result
```

`own_read` stays in `report.py` (its own tests still cover it); it is simply no
longer reachable from the API.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_api.py -q`
Expected: PASS

- [ ] **Step 5: Run the whole suite**

Run: `python -m pytest tests/ -q`
Expected: PASS, no database required.

- [ ] **Step 6: Commit**

```bash
git add weft/api.py tests/test_api.py
git commit -m "feat: unify answer submission into POST /api/answers"
```

---

### Task 6: Documentation and env example

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: the final contract from Tasks 1–5.
- Produces: accurate docs. Phase 1 reads the README endpoint table when writing the BFF client.

- [ ] **Step 1: Update the endpoint table**

In `README.md`, replace the rows for the removed endpoints so the table reads:

```markdown
| Method & path | What it does |
|---|---|
| `GET /api/bank` | The question set, with every score stripped |
| `POST /api/answers` | Submit a quiz. Without `invite_token` you are the originator (get a share token); with one you are the responder (a pair forms) |
| `POST /api/invite` | Make another share link for a session → a token |
| `GET /api/invite/{token}` | What the friend sees first: who invited them, and that sender's questions, ready to render |
| `GET /api/pair/{id}` | The shared-traits result for one pair, in words, with both profiles |
| `GET /api/session/{id}/pairs` | Every match for a session (either side), newest first |
```

Replace the "Two rules the API enforces" list with:

```markdown
- **Both people answer the same questions.** An invite carries the sender's
  question set *and* its rendered questions, so coverage matches on both sides.
- **A profile is never shown alone.** Submitting returns no read of your own —
  per-person profiles appear only inside a pair result, next to the
  compatibility it explains.
- **The result is friend-safe.** `GET /api/pair` returns headline, band, shared
  values, a difference, and each person's descriptive profile — no raw scores,
  and none of the other person's answers.
```

Add a row to the configuration table:

```markdown
| `WEFT_PROXY_KEY` | Shared secret the frontend proxy must send as `X-Weft-Proxy-Key`. Unset disables the check (local dev) | — |
```

And replace the CORS paragraph with:

```markdown
The frontend calls this API server-to-server through its own proxy, so no
browser ever hits it directly. Leave `WEFT_ALLOWED_ORIGINS` empty in production
and set `WEFT_PROXY_KEY` instead — CORS stays shut and the shared secret is what
grants access.
```

- [ ] **Step 2: Update `.env.example`**

Add:

```bash
# Shared secret the frontend proxy sends as X-Weft-Proxy-Key.
# Unset locally means no check. Generate with: python -c "import secrets;print(secrets.token_urlsafe(32))"
WEFT_PROXY_KEY=
```

- [ ] **Step 3: Verify the documented flow actually runs**

```bash
python -m pytest tests/ -q
python -c "
from fastapi.testclient import TestClient
from weft.api import create_app
from weft.storage import InMemoryStorage
from weft.trivia_engine import simulate
from weft.api import QUIZ_SET
c = TestClient(create_app(storage=InMemoryStorage(), now=lambda: '2026-07-25T10:00:00Z'))
a = c.post('/api/answers', json={'name':'Ana','email':'a@x.com','phone':'+1','answers':simulate(QUIZ_SET,{'BE':3},seed=1)}).json()
print('originator:', sorted(a))
inv = c.get(f\"/api/invite/{a['share_token']}\").json()
print('invite has questions:', bool(inv['questions']))
b = c.post('/api/answers', json={'name':'Ben','email':'b@x.com','phone':'+1','invite_token':a['share_token'],'answers':simulate(inv['question_set'],{'AC':3},seed=2)}).json()
print('responder:', sorted(b))
r = c.get(f\"/api/pair/{b['pair_id']}\").json()
print('people fields:', sorted(r['people'][0]))
"
```

Expected output:
```
originator: ['role', 'session_id', 'share_token']
invite has questions: True
responder: ['pair_id', 'role', 'session_id', 'share_token']
people fields: ['humour', 'life_stage', 'name', 'opens_up', 'pace', 'top_values']
```

- [ ] **Step 4: Commit**

```bash
git add README.md .env.example
git commit -m "docs: document the unified answers endpoint and proxy key"
```

---

## Phase 0 Exit Gate

**Stop here. Do not begin Phase 1.**

Verify and report all of the following:

- [ ] `python -m pytest tests/ -q` passes with no database configured
- [ ] Both branches of `POST /api/answers` verified (Task 6 Step 3 output matches)
- [ ] `GET /api/invite/{token}` returns renderable questions
- [ ] `pair_result` people carry `humour`, `opens_up`, `pace`, `life_stage`
- [ ] No response anywhere contains `read` / `own_read`
- [ ] Proxy key enforced when set, inert when unset
- [ ] README endpoint + config tables match the implemented contract
- [ ] All work committed on `feat/bff-contract`; `main` untouched

Report: what changed, test counts before/after, anything that differed from this
plan, and any decision that Phase 1 must know about. Then **wait for explicit
approval** before starting Phase 1.

---

## Subsequent phases

Each later phase gets its own plan document, written at its gate, because the
frontend tasks depend on the exact response shapes this phase finalises:

- **Phase 1** — Frontend BFF foundation (`lib/server/weftApi.ts`, `lib/server/session.ts`, `lib/weftTypes.ts`, `lib/answers.ts`)
- **Phase 2** — Bank route + details step + originator path
- **Phase 3** — Responder path + pair result
- **Phase 4** — Matches page + hardening

All Phase 1–4 work happens in `/Users/shearytan/Documents/SurnX/web-frontend` on
its own branch, cut from `main`.
