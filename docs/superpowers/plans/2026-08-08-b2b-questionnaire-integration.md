# B2B Questionnaire Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the event-scoped FastAPI form in `weft-b2b-backend` to the bilingual conversational questionnaire in `weft-web`, with same-browser drafts, one final idempotent submission, and no attendee credential exposed to JavaScript.

**Architecture:** FastAPI remains the source of truth for event state, translated questions, validation, idempotency, and persistence. Next.js loads the initial definition server-side and exposes narrowly scoped same-origin Route Handlers for language changes and final submission; the browser runs a local reducer and persists a versioned draft without making per-answer requests.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, async SQLAlchemy, Alembic, Postgres/pgvector, pytest; Next.js 16.2.11 App Router, React 19.2, TypeScript 5, Zod 4.4, Bun test, Motion.

## Global Constraints

- Frontend repository: `/Users/antoniopertuz/Documents/surnx/weft-web`.
- Backend repository: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend`.
- Prefix every shell command with `rtk`; run each command from the repository named by the task.
- Read the relevant local Next.js 16.2.11 guide in `node_modules/next/dist/docs/` before changing App Router code; the applicable guides are `01-app/01-getting-started/15-route-handlers.md`, `01-app/02-guides/backend-for-frontend.md`, `01-app/01-getting-started/06-fetching-data.md`, and `01-app/01-getting-started/10-error-handling.md`.
- Keep `WEFT_API_URL` and `WEFT_PROXY_KEY` unchanged; they belong to the existing B2C demo. Use the new server-only `WEFT_B2B_API_URL` for this questionnaire.
- Do not add a CORS policy, chat endpoint, streaming endpoint, per-answer API, state-management package, chat library, or internationalization package.
- Support exactly `en` and `es`; the language selector appears only on a fresh opening screen.
- Use `/questionnaire/[formToken]` for event forms. `/questionnaire` is a friendly missing-link state.
- Persist accepted answers on the same device only. Never persist or return the attendee token to browser JavaScript.
- The normal flow makes one initial FastAPI read and one final write; a non-default or resumed non-default language may make one extra read before conversation.
- Preserve backend option values as `str | int`; never stringify numeric values.
- Enforce maximum lengths in both layers: name/company 200, email 254, phone 32, `t1`/`t2` 1,000.
- Follow TDD: create the focused failing test, verify the expected failure, implement the smallest complete behavior, rerun focused tests, then commit in the repository changed by that task.
- Do not modify matching formulas, ML providers, worker topology, B2C contracts, reveal/waiting pages, or organizer tooling.

---

## File and Responsibility Map

### `weft-b2b-backend`

- `app/forms/definition.py` — canonical form metadata, bilingual labels, semantic input formats, shared length/selection constraints.
- `app/schemas/forms.py` — strict public read contract and authoritative final-submission schema.
- `app/api/v1/forms.py` — token-scoped HTTP boundary, `Idempotency-Key` header, event bootstrap data, attendee cookie.
- `app/services/submissions.py` — submission availability, version checks, canonical-payload comparison, idempotent creation/replay, job enqueueing.
- `app/core/exceptions.py` — additive stable domain error codes.
- `app/core/config.py` and `.env.example` — production-controlled attendee-cookie `Secure` flag.
- `app/db/models/core.py` — nullable UUID idempotency key on attendees, unique per event.
- `app/db/migrations/versions/a63d4e21f9c7_form_submission_idempotency.py` — additive column and named unique constraint.
- `tests/test_form_definition.py` — definition/schema/encoder drift protection.
- `tests/test_form_questions.py` — public bilingual bootstrap contract.
- `tests/test_forms.py` — submit, replay, conflict, cookie, validation, and background-job behavior.
- `tests/test_errors.py` — stable domain error response shape.
- `README.md` — updated public form contract and production cookie setting.

### `weft-web`

- `.env.example` — add `WEFT_B2B_API_URL` without changing B2C variables.
- `src/app/questionnaire/page.tsx` — tokenless missing-link state.
- `src/app/questionnaire/[formToken]/page.tsx` — dynamic server entry and initial FastAPI load.
- `src/app/api/questionnaire/[formToken]/route.ts` — same-origin language reload.
- `src/app/api/questionnaire/[formToken]/submit/route.ts` — validated idempotent final write and cookie forwarding.
- `src/features/questionnaire/schemas/questionnaire.contract.schema.ts` — FastAPI wire schemas and token/language validation.
- `src/features/questionnaire/schemas/questionnaire.schema.ts` — internal UI question, answer, conversation, and draft schemas.
- `src/features/questionnaire/types/questionnaire.types.ts` — inferred wire/domain types and stable error vocabulary.
- `src/features/questionnaire/model/questionnaire.mapper.ts` — pure snake_case backend DTO to camelCase UI model mapping.
- `src/features/questionnaire/model/questionnaire.reducer.ts` — pure draft transitions and derived conversation.
- `src/features/questionnaire/model/questionnaire.submission.ts` — exact 17-answer flat payload builder.
- `src/features/questionnaire/persistence/questionnaire.storage.ts` — token-scoped validated localStorage with memory fallback.
- `src/features/questionnaire/i18n/questionnaire.messages.ts` — typed English/Spanish UI-only copy.
- `src/features/questionnaire/api/server/questionnaire.gateway.ts` — only module that reads `WEFT_B2B_API_URL`; timeout, upstream validation, error mapping, cookie capture.
- `src/features/questionnaire/api/client/questionnaire.client.ts` — browser calls to the two same-origin handlers.
- `src/features/questionnaire/hooks/useQuestionnaireController.ts` — hydration, language selection, local answer commits, final submit/retry, version reset.
- `src/features/questionnaire/components/Questionnaire.tsx` — thin feature shell and state selection.
- `src/features/questionnaire/components/QuestionnaireFlow.tsx` — existing typewriter/composer animation orchestration extracted from the shell.
- `src/features/questionnaire/components/QuestionnaireOpening.tsx` — event context and one-time language choice.
- `src/features/questionnaire/components/QuestionnaireCompletion.tsx` — privacy-safe completion restore from language plus event context, without saved answers.
- `src/features/questionnaire/components/QuestionnaireNotice.tsx` — localized missing/unavailable/retry states.
- `src/features/questionnaire/components/LongTextComposer.tsx` — multiline `t1`/`t2` input.
- Existing composer files — optional Skip, semantic input attributes, numeric values, and backend selection limits.
- `src/features/questionnaire/test/backendFormFixtures.ts` — exact English/Spanish 17-question contract fixtures used only by tests.
- Existing questionnaire tests plus focused tests beside every new module — unit, route, interaction, resume, failure, bilingual, and accessibility coverage.

---

### Task 1: Harden the FastAPI Form Definition and Bootstrap Contract

**Repository:** `weft-b2b-backend`

**Files:**
- Modify: `app/forms/definition.py`
- Modify: `app/schemas/forms.py`
- Modify: `app/api/v1/forms.py`
- Modify: `app/services/submissions.py`
- Modify: `tests/test_form_definition.py`
- Modify: `tests/test_form_questions.py`
- Modify: `tests/test_forms.py`

**Interfaces:**
- Consumes: existing `FORM_VERSION`, `QUESTIONS`, `render(language)`, `Event`, and `SUBMITTABLE_STATES`.
- Produces: `Language`, `QuestionType`, `InputFormat`, shared length constants, `is_submittable(event) -> bool`, strict `FormQuestionsOut`, and `FormSubmission` containing `form_version` and `language`.

- [ ] **Step 1: Write failing definition and bootstrap tests**

Add assertions that pin metadata, exact types, limits, event context, availability, and submission metadata:

```python
# tests/test_form_definition.py
from app.forms.definition import (
    COMPANY_MAX_LENGTH,
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PHONE_MAX_LENGTH,
    PURPOSE_MAX_LENGTH,
)

SUBMISSION_METADATA = {"form_version", "language"}

def test_every_answer_field_has_a_question_and_vice_versa():
    answer_fields = set(FormSubmission.model_fields) - SUBMISSION_METADATA
    assert set(BY_KEY) == answer_fields

def test_required_flags_match_the_submit_schema():
    for key in set(FormSubmission.model_fields) - SUBMISSION_METADATA:
        assert BY_KEY[key].required is FormSubmission.model_fields[key].is_required(), key

def test_text_metadata_matches_submission_limits():
    rendered = {q["key"]: q for q in render("en")}
    assert rendered["name"]["format"] == "name"
    assert rendered["name"]["max_length"] == NAME_MAX_LENGTH == 200
    assert rendered["email"]["format"] == "email"
    assert rendered["email"]["max_length"] == EMAIL_MAX_LENGTH == 254
    assert rendered["phone"]["format"] == "tel"
    assert rendered["phone"]["max_length"] == PHONE_MAX_LENGTH == 32
    assert rendered["company"]["format"] == "organization"
    assert rendered["company"]["max_length"] == COMPANY_MAX_LENGTH == 200
    assert rendered["t1"]["max_length"] == PURPOSE_MAX_LENGTH == 1_000
    assert rendered["t2"]["max_length"] == PURPOSE_MAX_LENGTH
```

```python
# tests/test_form_questions.py
async def test_questions_include_event_context_and_availability(client, in_memory_jobs):
    event, _headers = await make_event(client)
    response = await client.get(f"/f/{event['form_token']}/questions")
    body = response.json()
    assert body["event_name"] == "Mixer"
    assert body["accepting_submissions"] is True
    assert body["language"] == "en"

async def test_locked_event_is_reported_as_not_accepting(client, db_session, in_memory_jobs):
    event, _headers = await make_event(client)
    stored = await db_session.get(Event, uuid.UUID(event["id"]))
    stored.state = EventState.locked
    await db_session.commit()
    body = (await client.get(f"/f/{event['form_token']}/questions")).json()
    assert body["accepting_submissions"] is False
```

Update the shared `FORM` fixture in `tests/test_forms.py`:

```python
FORM = {
    "form_version": "v1",
    "language": "en",
    "name": "Ana",
    "email": "ana@fintech.co",
    "t1": "Raise a seed round for my fintech",
    "t2": "An angel who knows LatAm fintech",
    "s1_situation": "own_business",
    "s1_function": "engineering_product",
    "s2": 3,
    "s3": "up",
    "s4": ["raise_capital"],
    "s5": ["experience"],
    "s6": 2,
    "s7": 2,
    "s8": 1,
    "s9": 3,
    "s10": 3,
}
```

- [ ] **Step 2: Run the focused tests and confirm the contract failures**

Run:

```bash
rtk uv run pytest tests/test_form_definition.py tests/test_form_questions.py tests/test_forms.py -q
```

Expected: failures for absent `format`, `max_length`, `event_name`, `accepting_submissions`, `form_version`, and `language` support.

- [ ] **Step 3: Add shared metadata to the canonical form definition**

Use one set of constants in `app/forms/definition.py`:

```python
FORM_VERSION = "v1"
NAME_MAX_LENGTH = 200
EMAIL_MAX_LENGTH = 254
PHONE_MAX_LENGTH = 32
COMPANY_MAX_LENGTH = 200
PURPOSE_MAX_LENGTH = 1_000

Language = Literal["en", "es"]
QuestionType = Literal["short_text", "long_text", "single_choice", "multi_choice"]
InputFormat = Literal["text", "name", "email", "tel", "organization"]

@dataclass(frozen=True)
class Question:
    key: str
    type: QuestionType
    required: bool
    labels: dict[str, str]
    options: tuple[Option, ...] = ()
    placeholders: dict[str, str] = field(default_factory=dict)
    min_select: int | None = None
    max_select: int | None = None
    format: InputFormat | None = None
    max_length: int | None = None
```

Assign `name`, `email`, `tel`, and `organization` formats to their four short fields; assign `text` plus `PURPOSE_MAX_LENGTH` to `t1` and `t2`. Extend `render()` to emit `format`, `max_length`, and `max_select` only when non-null.

- [ ] **Step 4: Tighten Pydantic request and response schemas**

Implement the public types in `app/schemas/forms.py`:

```python
class FormSubmission(BaseModel):
    form_version: str
    language: Language
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    email: EmailStr | None = Field(default=None, max_length=EMAIL_MAX_LENGTH)
    phone: str | None = Field(default=None, max_length=PHONE_MAX_LENGTH)
    company: str | None = Field(default=None, max_length=COMPANY_MAX_LENGTH)
    t1: str = Field(min_length=1, max_length=PURPOSE_MAX_LENGTH)
    t2: str = Field(min_length=1, max_length=PURPOSE_MAX_LENGTH)
    s1_situation: Situation
    s1_function: Function
    s2: int = Field(ge=1, le=5)
    s3: Literal["up", "peer", "down"]
    s4: list[AskChip] = Field(min_length=1)
    s5: list[OfferChip] = Field(default_factory=list)
    s6: int = Field(ge=1, le=4)
    s7: int = Field(ge=1, le=4)
    s8: int = Field(ge=1, le=4)
    s9: int = Field(ge=1, le=3)
    s10: int = Field(ge=1, le=3)

class QuestionOut(BaseModel):
    key: str
    type: QuestionType
    required: bool
    label: str
    placeholder: str | None = None
    format: InputFormat | None = None
    max_length: int | None = None
    options: list[QuestionOptionOut] | None = None
    min_select: int | None = None
    max_select: int | None = None

class FormQuestionsOut(BaseModel):
    form_version: str
    language: Language
    event_name: str
    accepting_submissions: bool
    questions: list[QuestionOut]
```

- [ ] **Step 5: Return event metadata through a service-owned availability rule**

Add to `app/services/submissions.py`:

```python
def is_submittable(event: Event) -> bool:
    return event.state in SUBMITTABLE_STATES
```

Update `questions()` in `app/api/v1/forms.py`:

```python
return FormQuestionsOut(
    form_version=FORM_VERSION,
    language=lang,
    event_name=event.name,
    accepting_submissions=submissions.is_submittable(event),
    questions=render(lang),
)
```

- [ ] **Step 6: Run focused backend verification**

Run:

```bash
rtk uv run pytest tests/test_form_definition.py tests/test_form_questions.py tests/test_forms.py -q
rtk uv run ruff check app/forms/definition.py app/schemas/forms.py app/api/v1/forms.py app/services/submissions.py tests/test_form_definition.py tests/test_form_questions.py tests/test_forms.py
```

Expected: all focused tests pass and Ruff reports no errors.

- [ ] **Step 7: Commit the bootstrap contract**

```bash
rtk git add app/forms/definition.py app/schemas/forms.py app/api/v1/forms.py app/services/submissions.py tests/test_form_definition.py tests/test_form_questions.py tests/test_forms.py
rtk git commit -m "feat(forms): harden questionnaire contract"
```

---

### Task 2: Make Final Submission Idempotent and Cookie-Safe

**Repository:** `weft-b2b-backend`

**Files:**
- Create: `app/db/migrations/versions/a63d4e21f9c7_form_submission_idempotency.py`
- Create: `tests/test_errors.py`
- Modify: `app/db/models/core.py`
- Modify: `app/core/exceptions.py`
- Modify: `app/core/config.py`
- Modify: `.env.example`
- Modify: `app/services/submissions.py`
- Modify: `app/api/v1/forms.py`
- Modify: `tests/test_forms.py`
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1 `FormSubmission`, `FORM_VERSION`, and `is_submittable(event)`.
- Produces: nullable `Attendee.client_submission_id`, named uniqueness constraint `uq_attendees_event_submission_id`, coded domain errors, and `submit_form(session, event, payload, client_submission_id) -> Attendee` with safe replay semantics.

- [ ] **Step 1: Write failing domain-error, version, replay, and cookie tests**

```python
# tests/test_errors.py
from app.core.exceptions import ConflictError

def test_domain_errors_include_a_stable_code():
    error = ConflictError("stale", code="form_version_conflict")
    assert error.code == "form_version_conflict"
    assert str(error) == "stale"
```

Keep the focused response assertion in `tests/test_forms.py`, where the test client already has a live app:

```python
async def test_stale_form_version_has_a_stable_conflict(client, in_memory_jobs):
    event, _headers = await make_event(client)
    response = await client.post(
        f"/f/{event['form_token']}/submit",
        headers={"Idempotency-Key": str(uuid.uuid4())},
        json={**FORM, "form_version": "v0"},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "form_version_conflict"

async def test_identical_retry_returns_one_attendee_response_and_job(
    client, db_session, in_memory_jobs
):
    event, _headers = await make_event(client)
    key = str(uuid.uuid4())
    url = f"/f/{event['form_token']}/submit"
    first = await client.post(url, headers={"Idempotency-Key": key}, json=FORM)
    replay = await client.post(url, headers={"Idempotency-Key": key}, json=FORM)
    assert first.status_code == replay.status_code == 201
    assert first.json() == replay.json()
    assert len((await db_session.execute(select(Attendee))).scalars().all()) == 1
    assert len((await db_session.execute(select(Response))).scalars().all()) == 1
    encode_jobs = [
        job for job in in_memory_jobs.jobs.values()
        if job["task_name"].endswith("encode_and_score")
    ]
    assert len(encode_jobs) == 1

async def test_reusing_key_with_different_payload_is_a_conflict(client, in_memory_jobs):
    event, _headers = await make_event(client)
    key = str(uuid.uuid4())
    url = f"/f/{event['form_token']}/submit"
    assert (await client.post(url, headers={"Idempotency-Key": key}, json=FORM)).status_code == 201
    changed = {**FORM, "t1": "A different goal"}
    response = await client.post(url, headers={"Idempotency-Key": key}, json=changed)
    assert response.status_code == 409
    assert response.json()["code"] == "idempotency_conflict"

async def test_submit_requires_a_uuid_idempotency_key(client, in_memory_jobs):
    event, _headers = await make_event(client)
    url = f"/f/{event['form_token']}/submit"
    assert (await client.post(url, json=FORM)).status_code == 422
    assert (
        await client.post(url, headers={"Idempotency-Key": "not-a-uuid"}, json=FORM)
    ).status_code == 422
```

Update all existing successful submit calls to include a fresh UUID header. Add a cookie test using `test_settings.attendee_cookie_secure = True` or a dedicated app setting fixture and assert `HttpOnly`, `SameSite=lax`, `Max-Age=86400`, and `Secure`.

- [ ] **Step 2: Run focused tests and confirm expected failures**

```bash
rtk uv run pytest tests/test_errors.py tests/test_forms.py -q
```

Expected: failures for missing error code support, required header, model column, replay behavior, version conflict, and `Secure` configuration.

- [ ] **Step 3: Add the model column and hand-written migration**

In `app/db/models/core.py`:

```python
class Attendee(Base):
    __tablename__ = "attendees"
    __table_args__ = (
        UniqueConstraint("event_id", "person_id"),
        UniqueConstraint(
            "event_id",
            "client_submission_id",
            name="uq_attendees_event_submission_id",
        ),
    )
    client_submission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
```

Create migration `a63d4e21f9c7` with `down_revision = "f8c31d0a7b46"`:

```python
def upgrade() -> None:
    op.add_column(
        "attendees",
        sa.Column("client_submission_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_attendees_event_submission_id",
        "attendees",
        ["event_id", "client_submission_id"],
    )

def downgrade() -> None:
    op.drop_constraint(
        "uq_attendees_event_submission_id", "attendees", type_="unique"
    )
    op.drop_column("attendees", "client_submission_id")
```

- [ ] **Step 4: Add stable domain codes and cookie configuration**

In `app/core/exceptions.py`:

```python
class DomainError(Exception):
    status_code = 400
    default_code = "domain_error"

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        self.code = code or self.default_code

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": str(exc), "code": exc.code},
        )
```

Add `attendee_cookie_secure: bool = False` to `Settings`, document `ATTENDEE_COOKIE_SECURE=false` in `.env.example`, and document that production deployments set it to `true`.

- [ ] **Step 5: Implement replay-before-validation service semantics**

The existing idempotency key lookup must happen before event-state and active-version checks so an ambiguous successful request can replay after an event closes or a new form version deploys.

```python
async def _submission_by_key(
    session: AsyncSession,
    event_id: uuid.UUID,
    client_submission_id: uuid.UUID,
) -> tuple[Attendee, Response] | None:
    row = (
        await session.execute(
            select(Attendee, Response)
            .join(Response, Response.attendee_id == Attendee.id)
            .where(
                Attendee.event_id == event_id,
                Attendee.client_submission_id == client_submission_id,
            )
        )
    ).one_or_none()
    return row

def _canonical_payload(payload: FormSubmission) -> dict:
    return payload.model_dump(mode="json")

def _validate_replay(
    row: tuple[Attendee, Response], payload: FormSubmission
) -> Attendee:
    attendee, stored_response = row
    if stored_response.raw != _canonical_payload(payload):
        raise ConflictError(
            "idempotency key was already used with different answers",
            code="idempotency_conflict",
        )
    return attendee
```

Change the public service signature and ordering:

```python
async def submit_form(
    session: AsyncSession,
    event: Event,
    payload: FormSubmission,
    client_submission_id: uuid.UUID,
) -> Attendee:
    replay = await _submission_by_key(session, event.id, client_submission_id)
    if replay is not None:
        return _validate_replay(replay, payload)
    if not is_submittable(event):
        raise ConflictError(
            f"event is {event.state.value}; form is closed",
            code="form_not_accepting",
        )
    if payload.form_version != FORM_VERSION:
        raise ConflictError(
            "the questionnaire changed; reload before submitting",
            code="form_version_conflict",
        )

    try:
        async with session.begin_nested():
            attendee = await _create_submission(
                session, event, payload, client_submission_id
            )
    except IntegrityError:
        replay = await _submission_by_key(session, event.id, client_submission_id)
        if replay is None:
            raise
        return _validate_replay(replay, payload)

    await tasks.encode_and_score.defer_async(attendee_id=str(attendee.id))
    if event.state in {EventState.published, EventState.live}:
        await tasks.insert_latecomer.defer_async(
            event_id=str(event.id), attendee_id=str(attendee.id)
        )
    return attendee
```

Extract `_create_submission()` from the existing person/attendee/response creation and set `client_submission_id` on `Attendee`. Keep all job enqueueing outside the nested transaction so a losing concurrent replay cannot enqueue twice.

- [ ] **Step 6: Require and forward the idempotency key in the route**

```python
IdempotencyKey = Annotated[uuid.UUID, Header(alias="Idempotency-Key")]

@router.post("/{form_token}/submit", status_code=201, response_model=SubmitOut)
async def submit(
    form_token: str,
    body: FormSubmission,
    idempotency_key: IdempotencyKey,
    session: DbSession,
    settings: AppSettings,
    response: Response,
) -> SubmitOut:
    event = await _resolve_event(session, settings, form_token)
    attendee = await submissions.submit_form(
        session, event, body, idempotency_key
    )
    token = make_attendee_token(attendee.id, settings)
    response.set_cookie(
        key=_cookie_name(event),
        value=token,
        httponly=True,
        secure=settings.attendee_cookie_secure,
        samesite="lax",
        max_age=60 * 60 * 24,
        path="/",
    )
    return SubmitOut(attendee_token=token)
```

- [ ] **Step 7: Apply the migration and run backend verification**

Run against the configured development/test database:

```bash
rtk uv run alembic upgrade head
rtk uv run pytest tests/test_errors.py tests/test_forms.py tests/test_form_questions.py tests/test_form_definition.py -q
rtk uv run ruff check app tests/test_errors.py tests/test_forms.py tests/test_form_questions.py tests/test_form_definition.py
```

Expected: migration reaches `a63d4e21f9c7`; focused tests pass; Ruff reports no errors.

- [ ] **Step 8: Update backend documentation and commit**

Document `Idempotency-Key`, `form_version`, `language`, bootstrap metadata, and `ATTENDEE_COOKIE_SECURE=true` for production in `README.md`.

```bash
rtk git add .env.example README.md app/core/config.py app/core/exceptions.py app/db/models/core.py app/db/migrations/versions/a63d4e21f9c7_form_submission_idempotency.py app/services/submissions.py app/api/v1/forms.py tests/test_errors.py tests/test_forms.py
rtk git commit -m "feat(forms): make attendee submission idempotent"
```

---

### Task 3: Define Frontend Contracts, Mapping, and Bilingual UI Copy

**Repository:** `weft-web`

**Files:**
- Create: `src/features/questionnaire/schemas/questionnaire.contract.schema.ts`
- Create: `src/features/questionnaire/model/questionnaire.mapper.ts`
- Create: `src/features/questionnaire/model/questionnaire.mapper.test.ts`
- Create: `src/features/questionnaire/i18n/questionnaire.messages.ts`
- Create: `src/features/questionnaire/i18n/questionnaire.messages.test.ts`
- Create: `src/features/questionnaire/test/backendFormFixtures.ts`
- Modify: `src/features/questionnaire/schemas/questionnaire.schema.ts`
- Modify: `src/features/questionnaire/schemas/questionnaire.schema.test.ts`
- Modify: `src/features/questionnaire/types/questionnaire.types.ts`
- Modify: `src/features/questionnaire/data/mockQuestionnaire.ts`
- Modify: `src/features/questionnaire/data/mockQuestionnaire.test.ts`
- Modify: `src/features/questionnaire/api/questionnaire.api.ts`
- Modify: `src/features/questionnaire/api/questionnaire.api.test.ts`
- Modify: `src/features/questionnaire/components/SingleChoiceComposer.tsx`
- Modify: `src/features/questionnaire/components/MultipleChoiceComposer.tsx`
- Modify: `src/features/questionnaire/components/HybridComposer.tsx`

**Interfaces:**
- Consumes: Task 1 `FormQuestionsOut` JSON shape and approved English/Spanish UI copy.
- Produces: `Language`, `FormDefinitionDto`, `Questionnaire`, `Question`, `AnswerScalar`, `AnswerValue`, `QuestionnaireErrorCode`, `mapQuestionnaireDefinition(dto)`, and `messagesFor(language)`.

- [ ] **Step 1: Add failing contract, mapper, and dictionary tests**

```ts
// model/questionnaire.mapper.test.ts
import { expect, test } from "bun:test";
import { backendFormEn } from "../test/backendFormFixtures";
import { formDefinitionSchema } from "../schemas/questionnaire.contract.schema";
import { mapQuestionnaireDefinition } from "./questionnaire.mapper";

test("maps the 17-question backend contract without stringifying numbers", () => {
  const dto = formDefinitionSchema.parse(backendFormEn);
  const questionnaire = mapQuestionnaireDefinition(dto);
  expect(questionnaire.questions).toHaveLength(17);
  const seniority = questionnaire.questions.find((q) => q.id === "s2");
  expect(seniority?.type).toBe("single_choice");
  if (seniority?.type !== "single_choice") throw new Error("s2 was not single choice");
  expect(seniority.options.map((option) => option.value)).toEqual([1, 2, 3, 4, 5]);
  expect(questionnaire.eventName).toBe("Mixer");
  expect(questionnaire.version).toBe("v1");
});

test("maps backend text semantics into focused UI metadata", () => {
  const questionnaire = mapQuestionnaireDefinition(
    formDefinitionSchema.parse(backendFormEn),
  );
  const email = questionnaire.questions.find((q) => q.id === "email");
  expect(email).toMatchObject({
    type: "text",
    multiline: false,
    inputFormat: "email",
    maxLength: 254,
    required: false,
  });
  const purpose = questionnaire.questions.find((q) => q.id === "t1");
  expect(purpose).toMatchObject({ type: "text", multiline: true, maxLength: 1000 });
});
```

```ts
// i18n/questionnaire.messages.test.ts
import { expect, test } from "bun:test";
import { questionnaireMessages } from "./questionnaire.messages";

test("English and Spanish expose exactly the same UI keys", () => {
  expect(Object.keys(questionnaireMessages.es).sort()).toEqual(
    Object.keys(questionnaireMessages.en).sort(),
  );
});
```

- [ ] **Step 2: Run the new unit tests and confirm missing-module failures**

```bash
rtk bun test src/features/questionnaire/model/questionnaire.mapper.test.ts src/features/questionnaire/i18n/questionnaire.messages.test.ts
```

Expected: module-not-found failures for the contract schema, mapper, fixtures, and dictionary.

- [ ] **Step 3: Implement exact wire schemas**

In `questionnaire.contract.schema.ts`:

```ts
import { z } from "zod";

export const languageSchema = z.enum(["en", "es"]);
export const formTokenSchema = z
  .string()
  .min(16)
  .max(512)
  .regex(/^[A-Za-z0-9._-]+$/);
export const optionValueSchema = z.union([z.string(), z.number().int()]);

const optionSchema = z.object({ value: optionValueSchema, label: z.string().min(1) });
const textBase = z.object({
  key: z.string().min(1),
  required: z.boolean(),
  label: z.string().min(1),
  placeholder: z.string().min(1).nullable().optional(),
  format: z.enum(["text", "name", "email", "tel", "organization"]),
  max_length: z.number().int().positive(),
});

export const backendQuestionSchema = z.discriminatedUnion("type", [
  textBase.extend({ type: z.literal("short_text") }),
  textBase.extend({ type: z.literal("long_text") }),
  z.object({
    key: z.string().min(1), type: z.literal("single_choice"), required: z.boolean(),
    label: z.string().min(1), options: z.array(optionSchema).min(2),
  }),
  z.object({
    key: z.string().min(1), type: z.literal("multi_choice"), required: z.boolean(),
    label: z.string().min(1), options: z.array(optionSchema).min(1),
    min_select: z.number().int().nonnegative().nullable().optional(),
    max_select: z.number().int().positive().nullable().optional(),
  }),
]);

export const formDefinitionSchema = z.object({
  form_version: z.string().min(1),
  language: languageSchema,
  event_name: z.string().min(1),
  accepting_submissions: z.boolean(),
  questions: z.array(backendQuestionSchema).length(17),
});

const situationSchema = z.enum(["company", "own_business", "independent", "exploring"]);
const functionSchema = z.enum([
  "engineering_product", "sales_bd", "marketing_growth", "ops_finance",
  "design", "investing", "exploring",
]);
const askChipSchema = z.enum([
  "raise_capital", "find_customers", "find_provider", "find_partners",
  "hire_talent", "find_job", "find_cofounder", "meet_peers",
]);
const offerChipSchema = z.enum([
  "experience", "intros", "distribution", "capital", "mentorship",
  "hiring", "technical_help",
]);

export const formSubmissionSchema = z.object({
  form_version: z.string().min(1),
  language: languageSchema,
  name: z.string().trim().min(1).max(200),
  email: z.string().email().max(254).nullable(),
  phone: z.string().trim().max(32).nullable(),
  company: z.string().trim().max(200).nullable(),
  t1: z.string().trim().min(1).max(1_000),
  t2: z.string().trim().min(1).max(1_000),
  s1_situation: situationSchema,
  s1_function: functionSchema,
  s2: z.number().int().min(1).max(5),
  s3: z.enum(["up", "peer", "down"]),
  s4: z.array(askChipSchema).min(1),
  s5: z.array(offerChipSchema),
  s6: z.number().int().min(1).max(4),
  s7: z.number().int().min(1).max(4),
  s8: z.number().int().min(1).max(4),
  s9: z.number().int().min(1).max(3),
  s10: z.number().int().min(1).max(3),
});

export type Language = z.infer<typeof languageSchema>;
export type FormDefinitionDto = z.infer<typeof formDefinitionSchema>;
export type FormSubmissionDto = z.infer<typeof formSubmissionSchema>;
```

- [ ] **Step 4: Extend internal schemas and inferred types**

Use these stable internal primitives in `questionnaire.schema.ts` and infer them in `questionnaire.types.ts`:

```ts
export const answerScalarSchema = z.union([z.string(), z.number().int()]);
export const answerValueSchema = z.union([
  answerScalarSchema,
  z.array(answerScalarSchema),
  z.null(),
]);

const textQuestionSchema = z.object({
  id: nonEmptyString,
  type: z.literal("text"),
  message: nonEmptyString,
  placeholder: nonEmptyString.optional(),
  required: z.boolean(),
  multiline: z.boolean(),
  inputFormat: z.enum(["text", "name", "email", "tel", "organization"]),
  maxLength: z.number().int().positive(),
});

export type QuestionnaireErrorCode =
  | "invalidLink"
  | "notFound"
  | "notAccepting"
  | "validation"
  | "versionConflict"
  | "idempotencyConflict"
  | "unavailable";

export type QuestionnaireClientErrorData = {
  code: QuestionnaireErrorCode;
  field?: string;
};
```

Change option values to `answerScalarSchema`; update choice answer parsing to compare values without coercion. Extend `questionnaireSchema` with `eventName`, `language`, `acceptingSubmissions`, and string `version`.

Optional text parsing accepts only the explicit `null` Skip sentinel; it does not treat an empty string as Skip:

```ts
function parseTextAnswer(value: unknown, required: boolean) {
  if (value === null && !required) return null;
  const parsed = z.string().safeParse(value);
  if (!parsed.success) throw new Error("This answer must be text");
  const trimmed = parsed.data.trim();
  if (required && trimmed.length === 0) throw new Error("An answer is required");
  return trimmed;
}
```

Retain the existing non-sensitive `id` property while the mock API still exists. Change `session.questionnaireVersion` to a string so the old mock runtime and the new B2B mapper share one domain type.

Keep the intermediate tree type-safe before Task 8 removes the mock runtime:

- update `mockQuestionnaire` to `version: "fixture-v1"`, `language: "en"`, `eventName: "Weft networking night"`, and `acceptingSubmissions: true`;
- add `multiline`, `inputFormat`, and `maxLength` to its text questions;
- update the wrong-version API test to use `questionnaireVersion: "v999"`;
- make the mock API's `displayAnswer()` render `null` as the localized skipped label and numbers through their option label or `String(value)`;
- change choice-composer selection state and callbacks to the new `AnswerScalar` type without changing their visual behavior. Task 7 adds and verifies the remaining B2B-specific composer behavior.

- [ ] **Step 5: Implement the pure mapper**

```ts
export function mapQuestionnaireDefinition(dto: FormDefinitionDto): Questionnaire {
  const copy = messagesFor(dto.language);
  return questionnaireSchema.parse({
    id: "weft-b2b-attendee",
    version: dto.form_version,
    language: dto.language,
    eventName: dto.event_name,
    acceptingSubmissions: dto.accepting_submissions,
    intro: copy.intro,
    completionMessages: copy.completionMessages,
    questions: dto.questions.map((question) => {
      if (question.type === "short_text" || question.type === "long_text") {
        return {
          id: question.key,
          type: "text" as const,
          message: question.label,
          placeholder: question.placeholder ?? undefined,
          required: question.required,
          multiline: question.type === "long_text",
          inputFormat: question.format,
          maxLength: question.max_length,
        };
      }
      return {
        id: question.key,
        type: question.type === "multi_choice" ? "multiple_choice" as const : "single_choice" as const,
        message: question.label,
        required: question.required,
        options: question.options.map((option) => ({
          id: `${question.key}:${typeof option.value}:${String(option.value)}`,
          label: option.label,
          value: option.value,
        })),
        ...(question.type === "multi_choice"
          ? {
              minSelections: question.min_select ?? (question.required ? 1 : 0),
              maxSelections: question.max_select ?? question.options.length,
            }
          : {}),
      };
    }),
  });
}
```

- [ ] **Step 6: Add exact bilingual UI-only copy**

Use a single `QuestionnaireMessages` type and these required values:

```ts
export const questionnaireMessages = {
  en: {
    openingEyebrow: "Weft questionnaire",
    openingTitle: "Let’s get to know you",
    openingSubtitle: "This helps us introduce you to the right people in the room.",
    welcome: "Hi, I’m Weft. I’ll ask you a few quick questions to help find your people.",
    english: "English",
    spanish: "Español",
    start: "Start",
    continue: "Continue",
    skip: "Skip",
    sendAnswer: "Send answer",
    retry: "Try again",
    missingLinkTitle: "Open your event link",
    missingLinkBody: "Use the link or QR code shared by the event organizer.",
    invalidLinkTitle: "This event link isn’t valid",
    invalidLinkBody: "Ask the event organizer for a new link or QR code.",
    notFoundTitle: "We couldn’t find this event",
    notFoundBody: "Check the link with the event organizer.",
    notAcceptingTitle: "This event isn’t accepting answers right now",
    notAcceptingBody: "Try again in a moment or ask the event organizer.",
    unavailableTitle: "This questionnaire isn’t available right now",
    unavailableBody: "Check the event link or try again in a moment.",
    versionReset: "The questionnaire was updated, so we need to start this draft again.",
    validationError: "That answer needs another look. Please update it and try again.",
    idempotencyConflict: "We couldn’t safely confirm this submission. Your answers are still saved.",
    submissionFailed: "We couldn’t finish your submission. Your answers are safe on this device.",
    skipped: "Skipped",
    completionMessages: [
      "You’re all set.",
      "Thanks. We’ll use your answers to introduce you to the right people.",
    ],
  },
  es: {
    openingEyebrow: "Cuestionario Weft",
    openingTitle: "Queremos conocerte",
    openingSubtitle: "Esto nos ayuda a presentarte a las personas indicadas en el evento.",
    welcome: "Hola, soy Weft. Te haré unas preguntas rápidas para ayudarte a encontrar a tu gente.",
    english: "English",
    spanish: "Español",
    start: "Comenzar",
    continue: "Continuar",
    skip: "Omitir",
    sendAnswer: "Enviar respuesta",
    retry: "Intentar de nuevo",
    missingLinkTitle: "Abre el enlace de tu evento",
    missingLinkBody: "Usa el enlace o código QR compartido por la organización del evento.",
    invalidLinkTitle: "Este enlace del evento no es válido",
    invalidLinkBody: "Pide un nuevo enlace o código QR a la organización del evento.",
    notFoundTitle: "No encontramos este evento",
    notFoundBody: "Confirma el enlace con la organización del evento.",
    notAcceptingTitle: "Este evento no está recibiendo respuestas ahora",
    notAcceptingBody: "Intenta de nuevo en un momento o consulta con la organización.",
    unavailableTitle: "Este cuestionario no está disponible ahora",
    unavailableBody: "Revisa el enlace del evento o intenta de nuevo en un momento.",
    versionReset: "El cuestionario cambió, así que necesitamos comenzar este borrador de nuevo.",
    validationError: "Necesitamos revisar esa respuesta. Actualízala e intenta de nuevo.",
    idempotencyConflict: "No pudimos confirmar este envío de forma segura. Tus respuestas siguen guardadas.",
    submissionFailed: "No pudimos finalizar el envío. Tus respuestas están seguras en este dispositivo.",
    skipped: "Omitida",
    completionMessages: [
      "Todo listo.",
      "Gracias. Usaremos tus respuestas para presentarte a las personas indicadas.",
    ],
  },
} satisfies Record<Language, QuestionnaireMessages>;
```

Derive `intro` in the mapper from `openingEyebrow`, `openingTitle`, `openingSubtitle`, and `welcome`.

- [ ] **Step 7: Add exact 17-question test fixtures and pass unit tests**

Create English and Spanish fixtures with these ordered keys and types copied from the backend contract: `name/email/phone/company` short text, `t1/t2` long text, `s1_situation/s1_function/s2/s3/s6/s7/s8/s9/s10` single choice, and `s4/s5` multi choice. Include the exact option values from `app/forms/definition.py`; ensure `s2`, `s6`, `s7`, `s8`, `s9`, and `s10` use numbers.

Run:

```bash
rtk bun test src/features/questionnaire/schemas/questionnaire.schema.test.ts src/features/questionnaire/model/questionnaire.mapper.test.ts src/features/questionnaire/i18n/questionnaire.messages.test.ts src/features/questionnaire/data/mockQuestionnaire.test.ts src/features/questionnaire/api/questionnaire.api.test.ts src/features/questionnaire/components/QuestionComposer.test.tsx
rtk tsc --noEmit
```

Expected: all focused tests pass and TypeScript reports no errors.

- [ ] **Step 8: Commit frontend contracts**

```bash
rtk git add src/features/questionnaire/schemas/questionnaire.contract.schema.ts src/features/questionnaire/schemas/questionnaire.schema.ts src/features/questionnaire/schemas/questionnaire.schema.test.ts src/features/questionnaire/types/questionnaire.types.ts src/features/questionnaire/model/questionnaire.mapper.ts src/features/questionnaire/model/questionnaire.mapper.test.ts src/features/questionnaire/i18n/questionnaire.messages.ts src/features/questionnaire/i18n/questionnaire.messages.test.ts src/features/questionnaire/test/backendFormFixtures.ts src/features/questionnaire/data/mockQuestionnaire.ts src/features/questionnaire/data/mockQuestionnaire.test.ts src/features/questionnaire/api/questionnaire.api.ts src/features/questionnaire/api/questionnaire.api.test.ts src/features/questionnaire/components/SingleChoiceComposer.tsx src/features/questionnaire/components/MultipleChoiceComposer.tsx src/features/questionnaire/components/HybridComposer.tsx
rtk git commit -m "feat(questionnaire): define B2B form contracts"
```

---

### Task 4: Build the Pure Draft Reducer, Storage, and Submission Adapter

**Repository:** `weft-web`

**Files:**
- Create: `src/features/questionnaire/model/questionnaire.reducer.ts`
- Create: `src/features/questionnaire/model/questionnaire.reducer.test.ts`
- Create: `src/features/questionnaire/model/questionnaire.submission.ts`
- Create: `src/features/questionnaire/model/questionnaire.submission.test.ts`
- Create: `src/features/questionnaire/persistence/questionnaire.storage.ts`
- Create: `src/features/questionnaire/persistence/questionnaire.storage.test.ts`
- Modify: `src/features/questionnaire/schemas/questionnaire.schema.ts`
- Modify: `src/features/questionnaire/types/questionnaire.types.ts`

**Interfaces:**
- Consumes: Task 3 `Questionnaire`, `Question`, `Language`, `AnswerValue`, `FormSubmissionDto`, and bilingual messages.
- Produces: `QuestionnaireState`, `QuestionnaireAction`, `createQuestionnaireState`, `questionnaireReducer`, `selectQuestionnaireResult`, `buildFormSubmission`, `hydrateDraft`, `toDraftRecord`, `toCompletedRecord`, `readDraft`, `writeDraft`, and `writeCompleted`.

- [ ] **Step 1: Write failing reducer and persistence tests**

```ts
// model/questionnaire.reducer.test.ts
test("accepted answers advance locally without an API result", () => {
  const state = createQuestionnaireState(questionnaireEn, {
    submissionId: "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
  });
  const started = questionnaireReducer(state, { type: "started" });
  const answered = questionnaireReducer(started, {
    type: "answerAccepted",
    questionId: "name",
    value: "Ana",
  });
  expect(answered.currentQuestionIndex).toBe(1);
  expect(answered.answers.name).toBe("Ana");
  expect(answered.status).toBe("active");
});

test("completion removes personal answers from the durable record", () => {
  const completed = toCompletedRecord(fullyAnsweredState);
  expect(completed.status).toBe("completed");
  expect("answers" in completed).toBe(false);
  expect("submissionId" in completed).toBe(false);
});
```

```ts
// persistence/questionnaire.storage.test.ts
test("corrupt storage resets safely and unavailable storage uses memory", () => {
  const corrupt = createMemoryQuestionnaireStorage("not-json");
  expect(readDraft("event-token-1234", corrupt)).toBeNull();
  const unavailable = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  writeDraft("event-token-1234", validDraft, unavailable);
  expect(readDraft("event-token-1234", unavailable)).toEqual(validDraft);
});

test("an incomplete version mismatch resets but completion remains complete", () => {
  expect(hydrateDraft(questionnaireV2, draftV1).kind).toBe("versionReset");
  expect(hydrateDraft(questionnaireV2, completedV1).kind).toBe("completed");
});
```

- [ ] **Step 2: Write the exact submission-adapter test**

```ts
test("builds the flat FastAPI body and preserves numeric choices", () => {
  const body = buildFormSubmission(questionnaireEn, {
    name: "Ana",
    email: null,
    phone: "+57 300 000 0000",
    company: null,
    t1: "Raise a seed round",
    t2: "A LatAm fintech angel",
    s1_situation: "own_business",
    s1_function: "engineering_product",
    s2: 3,
    s3: "up",
    s4: ["raise_capital"],
    s5: [],
    s6: 2,
    s7: 2,
    s8: 1,
    s9: 3,
    s10: 3,
  });
  expect(body.form_version).toBe("v1");
  expect(body.language).toBe("en");
  expect(body.s2).toBe(3);
  expect(body.email).toBeNull();
});
```

- [ ] **Step 3: Run tests and confirm missing reducer/storage failures**

```bash
rtk bun test src/features/questionnaire/model/questionnaire.reducer.test.ts src/features/questionnaire/model/questionnaire.submission.test.ts src/features/questionnaire/persistence/questionnaire.storage.test.ts
```

Expected: module-not-found failures.

- [ ] **Step 4: Implement discriminated durable records and pure transitions**

Define the durable schemas:

```ts
const draftBaseSchema = z.object({
  schemaVersion: z.literal(1),
  formVersion: z.string().min(1),
  language: languageSchema,
  updatedAt: z.string().datetime(),
});

export const draftRecordSchema = z.discriminatedUnion("status", [
  draftBaseSchema.extend({
    status: z.literal("draft"),
    answers: z.record(z.string(), answerValueSchema),
    currentQuestionIndex: z.number().int().nonnegative(),
    submissionId: z.string().uuid(),
  }),
  draftBaseSchema.extend({ status: z.literal("completed") }),
]);
```

Use these state/action names consistently:

```ts
export type QuestionnaireState = {
  questionnaire: Questionnaire;
  status: "opening" | "active" | "submitting" | "completed";
  answers: Record<string, AnswerValue>;
  currentQuestionIndex: number;
  submissionId: string;
  resetReason: "versionChanged" | null;
  submissionError: QuestionnaireClientErrorData | null;
  correctionQuestionId: string | null;
};

export type QuestionnaireAction =
  | { type: "started" }
  | { type: "definitionReplaced"; questionnaire: Questionnaire }
  | { type: "answerAccepted"; questionId: string; value: AnswerValue }
  | { type: "submissionStarted" }
  | { type: "submissionFailed"; error: QuestionnaireClientErrorData }
  | { type: "submissionSucceeded" }
  | { type: "versionReset"; questionnaire: Questionnaire; submissionId: string };
```

`answerAccepted` must validate the active question through `parseAnswerForQuestion`, reject duplicate/out-of-order answers, and advance locally. `selectQuestionnaireResult` derives welcome, questions, displayed answers, and completion messages from state rather than persisting conversation strings.

- [ ] **Step 5: Implement safe storage**

```ts
export const QUESTIONNAIRE_DRAFT_PREFIX = "weft:b2b-questionnaire:v1:";

export function draftKey(formToken: string) {
  return `${QUESTIONNAIRE_DRAFT_PREFIX}${formToken}`;
}

export function readDraft(
  formToken: string,
  storage: QuestionnaireStorage = defaultStorage(),
): DraftRecord | null {
  const raw = safeStorage(storage).getItem(draftKey(formToken));
  if (!raw) return null;
  try {
    return draftRecordSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
```

Reuse the current WeakMap memory-fallback behavior, but move it out of the mock API. `writeCompleted()` writes a completed record with no `answers` or `submissionId`.

Keep these signatures stable for the controller task:

```ts
export function hydrateDraft(
  questionnaire: Questionnaire,
  record: DraftRecord | null,
):
  | { kind: "fresh"; state: QuestionnaireState }
  | { kind: "resumed"; state: QuestionnaireState }
  | { kind: "versionReset"; state: QuestionnaireState }
  | { kind: "completed"; language: Language };

export function toDraftRecord(state: QuestionnaireState): DraftRecord;
export function toCompletedRecord(state: QuestionnaireState): DraftRecord;
export function writeDraft(
  formToken: string,
  record: DraftRecord,
  storage?: QuestionnaireStorage,
): void;
export function writeCompleted(
  formToken: string,
  state: QuestionnaireState,
  storage?: QuestionnaireStorage,
): void;
```

- [ ] **Step 6: Implement the exact 17-field submission builder**

`buildFormSubmission(questionnaire, answers)` must construct and parse this object; do not spread arbitrary record keys:

```ts
return formSubmissionSchema.parse({
  form_version: questionnaire.version,
  language: questionnaire.language,
  name: answers.name,
  email: answers.email === null ? null : answers.email,
  phone: answers.phone === null ? null : answers.phone,
  company: answers.company === null ? null : answers.company,
  t1: answers.t1,
  t2: answers.t2,
  s1_situation: answers.s1_situation,
  s1_function: answers.s1_function,
  s2: answers.s2,
  s3: answers.s3,
  s4: answers.s4,
  s5: answers.s5,
  s6: answers.s6,
  s7: answers.s7,
  s8: answers.s8,
  s9: answers.s9,
  s10: answers.s10,
});
```

- [ ] **Step 7: Pass focused tests and commit**

```bash
rtk bun test src/features/questionnaire/model/questionnaire.reducer.test.ts src/features/questionnaire/model/questionnaire.submission.test.ts src/features/questionnaire/persistence/questionnaire.storage.test.ts
rtk tsc --noEmit
rtk git add src/features/questionnaire/model/questionnaire.reducer.ts src/features/questionnaire/model/questionnaire.reducer.test.ts src/features/questionnaire/model/questionnaire.submission.ts src/features/questionnaire/model/questionnaire.submission.test.ts src/features/questionnaire/persistence/questionnaire.storage.ts src/features/questionnaire/persistence/questionnaire.storage.test.ts src/features/questionnaire/schemas/questionnaire.schema.ts src/features/questionnaire/types/questionnaire.types.ts
rtk git commit -m "feat(questionnaire): add durable local draft model"
```

---

### Task 5: Build the Server-Only B2B Gateway

**Repository:** `weft-web`

**Files:**
- Create: `src/features/questionnaire/api/server/questionnaire.gateway.ts`
- Create: `src/features/questionnaire/api/server/questionnaire.gateway.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Task 3 `formTokenSchema`, `languageSchema`, `formDefinitionSchema`, `formSubmissionSchema`, and `mapQuestionnaireDefinition`.
- Produces: `loadQuestionnaire(formToken, language?, fetchImpl?) -> Promise<LoadQuestionnaireOutcome>` and `submitQuestionnaire(formToken, submissionId, body, fetchImpl?) -> Promise<SubmitQuestionnaireOutcome>`.

- [ ] **Step 1: Write failing gateway tests for success, validation, status mapping, and cookie capture**

```ts
test("loads and maps an uncached bilingual definition", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/f/token-valid-123456/questions?lang=es");
    expect(init?.cache).toBe("no-store");
    return Response.json(backendFormEs);
  };
  const outcome = await loadQuestionnaire("token-valid-123456", "es", fetchImpl as typeof fetch);
  expect(outcome.status).toBe("ok");
  if (outcome.status === "ok") expect(outcome.questionnaire.language).toBe("es");
});

test("maps upstream form errors without leaking the token", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const unauthorized = async () => Response.json({ detail: "bad" }, { status: 401 });
  const outcome = await loadQuestionnaire(
    "token-valid-123456",
    undefined,
    unauthorized as typeof fetch,
  );
  expect(outcome).toEqual({ status: "invalidLink" });
});

test("requires the attendee cookie and hides the response token", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const fetchImpl = async () => new Response(
    JSON.stringify({ attendee_token: "secret-attendee-token" }),
    {
      status: 201,
      headers: {
        "content-type": "application/json",
        "set-cookie": "weft_attendee_event=secret-attendee-token; HttpOnly; SameSite=lax; Path=/",
      },
    },
  );
  const outcome = await submitQuestionnaire(
    "token-valid-123456",
    "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
    validSubmission,
    fetchImpl as typeof fetch,
  );
  expect(outcome.status).toBe("ok");
  if (outcome.status === "ok") {
    expect(outcome.setCookie).toContain("HttpOnly");
    expect(JSON.stringify(outcome)).not.toContain("secret-attendee-token");
  }
});
```

Pin the remaining mappings with table-driven tests:

```ts
test.each([
  [404, { detail: "missing", code: "not_found" }, { status: "notFound" }],
  [409, { detail: "closed", code: "form_not_accepting" }, { status: "notAccepting" }],
  [409, { detail: "changed", code: "form_version_conflict" }, { status: "versionConflict" }],
  [409, { detail: "reused", code: "idempotency_conflict" }, { status: "idempotencyConflict" }],
] as const)("maps upstream %s safely", async (status, body, expected) => {
  const fetchImpl = async () => Response.json(body, { status });
  expect(
    await submitQuestionnaire(
      "token-valid-123456",
      "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
      validSubmission,
      fetchImpl as typeof fetch,
    ),
  ).toEqual(expected);
});

test("extracts the failing body field from FastAPI validation", async () => {
  const fetchImpl = async () => Response.json(
    { detail: [{ loc: ["body", "email"], msg: "invalid email", type: "value_error" }] },
    { status: 422 },
  );
  const outcome = await submitQuestionnaire(
    "token-valid-123456",
    "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
    validSubmission,
    fetchImpl as typeof fetch,
  );
  expect(outcome).toEqual({ status: "validation", field: "email" });
});

test("treats thrown fetches, 5xx, invalid JSON, and missing cookies as unavailable", async () => {
  const thrown = async () => { throw new Error("network down"); };
  const serverError = async () => Response.json({}, { status: 503 });
  const invalidJson = async () => new Response("not-json", { status: 200 });
  const missingCookie = async () => Response.json(
    { attendee_token: "secret-attendee-token" },
    { status: 201 },
  );
  expect((await loadQuestionnaire("token-valid-123456", undefined, thrown as typeof fetch)).status).toBe("unavailable");
  expect((await loadQuestionnaire("token-valid-123456", undefined, serverError as typeof fetch)).status).toBe("unavailable");
  expect((await loadQuestionnaire("token-valid-123456", undefined, invalidJson as typeof fetch)).status).toBe("unavailable");
  expect((await submitQuestionnaire(
    "token-valid-123456",
    "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
    validSubmission,
    missingCookie as typeof fetch,
  )).status).toBe("unavailable");
});
```

- [ ] **Step 2: Run tests and confirm the gateway is missing**

```bash
rtk bun test src/features/questionnaire/api/server/questionnaire.gateway.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the server-only gateway with a stable outcome union**

```ts
export type QuestionnaireFailure =
  | { status: "invalidLink" }
  | { status: "notFound" }
  | { status: "notAccepting" }
  | { status: "versionConflict" }
  | { status: "idempotencyConflict" }
  | { status: "validation"; field?: string }
  | { status: "unavailable" };

export type LoadQuestionnaireOutcome =
  | { status: "ok"; questionnaire: Questionnaire }
  | QuestionnaireFailure;

export type SubmitQuestionnaireOutcome =
  | { status: "ok"; setCookie: string }
  | QuestionnaireFailure;
```

Use `WEFT_B2B_API_URL`, `encodeURIComponent(formToken)`, `AbortSignal.timeout(8_000)`, `cache: "no-store"`, and `Content-Type: application/json`. Do not call `console.error` with the URL, token, body, upstream detail, or cookie. Logging may include only a generic operation name and status number.

On `422`, inspect FastAPI's `detail` array and return the first string field after `body`; for example `loc: ["body", "email"]` becomes `field: "email"`. On coded domain errors, read only the `code` value. Parse every `200/201` body with Zod. A successful submit without a `Set-Cookie` is `unavailable` so the idempotent browser retry can recover the credential.

- [ ] **Step 4: Document the isolated environment variable**

Append to `.env.example` without editing the existing B2C values:

```env
# FastAPI event/questionnaire backend. Server-only; never NEXT_PUBLIC_.
WEFT_B2B_API_URL=http://localhost:8000
```

- [ ] **Step 5: Pass gateway tests and commit**

```bash
rtk bun test src/features/questionnaire/api/server/questionnaire.gateway.test.ts
rtk tsc --noEmit
rtk git add .env.example src/features/questionnaire/api/server/questionnaire.gateway.ts src/features/questionnaire/api/server/questionnaire.gateway.test.ts
rtk git commit -m "feat(questionnaire): add B2B server gateway"
```

---

### Task 6: Add Same-Origin Route Handlers and Browser Client

**Repository:** `weft-web`

**Files:**
- Create: `src/app/api/questionnaire/[formToken]/route.ts`
- Create: `src/app/api/questionnaire/[formToken]/route.test.ts`
- Create: `src/app/api/questionnaire/[formToken]/submit/route.ts`
- Create: `src/app/api/questionnaire/[formToken]/submit/route.test.ts`
- Create: `src/features/questionnaire/api/client/questionnaire.client.ts`
- Create: `src/features/questionnaire/api/client/questionnaire.client.test.ts`

**Interfaces:**
- Consumes: Task 5 gateway outcomes and Task 3 runtime schemas.
- Produces: `QuestionnaireClient`, `questionnaireClient`, `QuestionnaireClientError`, `GET /api/questionnaire/[formToken]?lang=en|es`, and `POST /api/questionnaire/[formToken]/submit`.

- [ ] **Step 1: Write failing route and client tests**

```ts
test("submit route returns only completion and forwards HttpOnly cookie", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(
    JSON.stringify({ attendee_token: "attendee-secret" }),
    {
      status: 201,
      headers: {
        "content-type": "application/json",
        "set-cookie": "weft_attendee_event=attendee-secret; HttpOnly; SameSite=lax; Path=/",
      },
    },
  )) as typeof fetch;
  try {
    const response = await POST(
      new Request("http://localhost/api/questionnaire/token-valid-123456/submit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
        },
        body: JSON.stringify(validSubmission),
      }),
      { params: Promise.resolve({ formToken: "token-valid-123456" }) },
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "completed" });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

Add tests proving invalid tokens/languages/bodies/UUIDs return `400` without upstream calls, safe failure bodies never contain upstream detail, and the GET route sets `Cache-Control: no-store`. Client tests must assert URL encoding, the idempotency header, schema parsing, and conversion of safe error bodies into `QuestionnaireClientError`.

- [ ] **Step 2: Run tests and confirm missing route/client failures**

```bash
rtk bun test 'src/app/api/questionnaire/[formToken]/route.test.ts' 'src/app/api/questionnaire/[formToken]/submit/route.test.ts' src/features/questionnaire/api/client/questionnaire.client.test.ts
```

Expected: module-not-found failures.

- [ ] **Step 3: Implement the GET language route**

```ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ formToken: string }> },
) {
  const tokenResult = formTokenSchema.safeParse((await params).formToken);
  const languageResult = languageSchema.safeParse(
    new URL(request.url).searchParams.get("lang"),
  );
  if (!tokenResult.success || !languageResult.success) {
    return Response.json({ code: "validation" }, { status: 400 });
  }
  const outcome = await loadQuestionnaire(tokenResult.data, languageResult.data);
  if (outcome.status === "ok") {
    return Response.json(outcome.questionnaire, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  return questionnaireFailureResponse(outcome);
}
```

Define `questionnaireFailureResponse()` in the route module or a focused server response helper and map the stable outcomes to safe codes/statuses: invalid link `401`, not found `404`, not accepting/version/idempotency conflict `409`, validation `400`, unavailable `503`.

- [ ] **Step 4: Implement the POST submit route**

Validate the token, UUID header, and body before calling the gateway. On success:

```ts
const response = Response.json({ status: "completed" }, { status: 201 });
response.headers.append("Set-Cookie", outcome.setCookie);
response.headers.set("Cache-Control", "no-store");
return response;
```

Never include the parsed upstream `attendee_token` in the response body.

- [ ] **Step 5: Implement the browser client**

```ts
export type QuestionnaireClient = {
  loadLanguage(formToken: string, language: Language): Promise<Questionnaire>;
  submit(
    formToken: string,
    submissionId: string,
    body: FormSubmissionDto,
  ): Promise<void>;
};

export class QuestionnaireClientError extends Error {
  constructor(
    readonly data: QuestionnaireClientErrorData,
  ) {
    super(data.code);
    this.name = "QuestionnaireClientError";
  }
}
```

Use `encodeURIComponent(formToken)`, pass an `AbortSignal`, parse successful GET JSON with `questionnaireSchema`, require `{status:"completed"}` on POST, and translate safe `{code, field?}` failures only. Do not automatically generate a new idempotency key or retry a POST.

- [ ] **Step 6: Pass route/client tests and commit**

```bash
rtk bun test 'src/app/api/questionnaire/[formToken]/route.test.ts' 'src/app/api/questionnaire/[formToken]/submit/route.test.ts' src/features/questionnaire/api/client/questionnaire.client.test.ts
rtk tsc --noEmit
rtk git add 'src/app/api/questionnaire/[formToken]/route.ts' 'src/app/api/questionnaire/[formToken]/route.test.ts' 'src/app/api/questionnaire/[formToken]/submit/route.ts' 'src/app/api/questionnaire/[formToken]/submit/route.test.ts' src/features/questionnaire/api/client/questionnaire.client.ts src/features/questionnaire/api/client/questionnaire.client.test.ts
rtk git commit -m "feat(questionnaire): add same-origin B2B routes"
```

---

### Task 7: Adapt Composers to the Backend Question Semantics

**Repository:** `weft-web`

**Files:**
- Create: `src/features/questionnaire/components/LongTextComposer.tsx`
- Create: `src/features/questionnaire/components/LongTextComposer.test.tsx`
- Modify: `src/features/questionnaire/components/TextComposer.tsx`
- Modify: `src/features/questionnaire/components/SingleChoiceComposer.tsx`
- Modify: `src/features/questionnaire/components/MultipleChoiceComposer.tsx`
- Modify: `src/features/questionnaire/components/QuestionComposer.tsx`
- Modify: `src/features/questionnaire/components/QuestionComposer.test.tsx`
- Modify: `src/features/questionnaire/components/QuestionComposer.interaction.mount.tsx`

**Interfaces:**
- Consumes: Task 3 internal `Question`, `AnswerScalar`, `AnswerValue`, and `QuestionnaireMessages`.
- Produces: accessible composers that emit `string | number | (string | number)[] | null` without coercion.

- [ ] **Step 1: Add failing composer tests**

Cover the four production behaviors:

```ts
test("numeric single choice emits the original number", async () => {
  await withComposer(numericSingleQuestion, async (container, submissions) => {
    await act(async () => buttonNamed(container, "5–10 years").click());
    expect(submissions).toEqual([3]);
  });
});

test("optional short text exposes Skip and email semantics", async () => {
  await withComposer(optionalEmailQuestion, async (container, submissions) => {
    const input = container.querySelector<HTMLInputElement>('input[type="email"]');
    expect(input?.autocomplete).toBe("email");
    expect(input?.maxLength).toBe(254);
    await act(async () => buttonNamed(container, "Skip").click());
    expect(submissions).toEqual([null]);
  });
});

test("long text uses a bounded textarea", async () => {
  await withComposer(longTextQuestion, async (container) => {
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea?.maxLength).toBe(1000);
  });
});

test("optional multi choice may continue with zero selections", async () => {
  await withComposer(optionalOffersQuestion, async (container, submissions) => {
    await act(async () => buttonNamed(container, "Continue").click());
    expect(submissions).toEqual([[]]);
  });
});
```

- [ ] **Step 2: Run focused tests and confirm failures**

```bash
rtk bun test src/features/questionnaire/components/QuestionComposer.test.tsx src/features/questionnaire/components/QuestionComposer.interaction.test.ts src/features/questionnaire/components/LongTextComposer.test.tsx
```

Expected: failures for number typing, Skip, textarea, and new metadata.

- [ ] **Step 3: Preserve scalar types in choice composers**

Change `SingleChoiceComposer` selection and callback types to `AnswerScalar`; change `MultipleChoiceComposer` state/callback types to `AnswerScalar[]`. Equality and `includes()` use exact values. Do not call `String(option.value)` except for non-semantic React keys already supplied by `option.id`.

```ts
// SingleChoiceComposer
onSubmit: (value: AnswerScalar) => Promise<void> | void;
const [selected, setSelected] = useState<AnswerScalar | null>(null);
const choose = async (value: AnswerScalar) => {
  if (disabled || submitting) return;
  setSelected(value);
  setSubmitting(true);
  await onSubmit(value);
};

// MultipleChoiceComposer
onSubmit: (value: AnswerScalar[]) => Promise<void> | void;
const [selected, setSelected] = useState<AnswerScalar[]>([]);
```

- [ ] **Step 4: Add optional Skip and semantic short-text attributes**

Map internal formats as follows:

```ts
const attributes = {
  text: { type: "text", inputMode: "text", autoComplete: "off" },
  name: { type: "text", inputMode: "text", autoComplete: "name" },
  email: { type: "email", inputMode: "email", autoComplete: "email" },
  tel: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  organization: { type: "text", inputMode: "text", autoComplete: "organization" },
} as const;
```

Apply `maxLength={question.maxLength}`. Render the localized Skip button only when `required` is false; its handler calls `onSubmit(null)`. Required fields still trim and reject empty values.

- [ ] **Step 5: Add a focused multiline composer and wire the dispatcher**

`LongTextComposer` mirrors text submit/error/focus behavior but uses a `<textarea rows={4}>`, allows Shift+Enter naturally, and submits only from its send button or Ctrl/Cmd+Enter. In `QuestionComposer`, branch on `question.type === "text" && question.multiline` before rendering `TextComposer`.

```tsx
if (question.type === "text") {
  return question.multiline ? (
    <LongTextComposer {...props} question={question} />
  ) : (
    <TextComposer {...props} question={question} />
  );
}
```

- [ ] **Step 6: Pass composer tests and commit**

```bash
rtk bun test src/features/questionnaire/components/QuestionComposer.test.tsx src/features/questionnaire/components/QuestionComposer.interaction.test.ts src/features/questionnaire/components/LongTextComposer.test.tsx
rtk tsc --noEmit
rtk git add src/features/questionnaire/components/LongTextComposer.tsx src/features/questionnaire/components/LongTextComposer.test.tsx src/features/questionnaire/components/TextComposer.tsx src/features/questionnaire/components/SingleChoiceComposer.tsx src/features/questionnaire/components/MultipleChoiceComposer.tsx src/features/questionnaire/components/QuestionComposer.tsx src/features/questionnaire/components/QuestionComposer.test.tsx src/features/questionnaire/components/QuestionComposer.interaction.mount.tsx
rtk git commit -m "feat(questionnaire): support B2B answer controls"
```

---

### Task 8: Replace Mock Runtime Orchestration with the Local Controller and Event Route

**Repository:** `weft-web`

**Files:**
- Create: `src/features/questionnaire/hooks/useQuestionnaireController.ts`
- Create: `src/features/questionnaire/hooks/useQuestionnaireController.test.tsx`
- Create: `src/features/questionnaire/components/QuestionnaireFlow.tsx`
- Create: `src/features/questionnaire/components/QuestionnaireOpening.tsx`
- Create: `src/features/questionnaire/components/QuestionnaireCompletion.tsx`
- Create: `src/features/questionnaire/components/QuestionnaireNotice.tsx`
- Create: `src/app/questionnaire/[formToken]/page.tsx`
- Create: `src/app/questionnaire/[formToken]/page.test.tsx`
- Modify: `src/features/questionnaire/components/Questionnaire.tsx`
- Modify: `src/features/questionnaire/components/Questionnaire.interaction.mount.tsx`
- Modify: `src/features/questionnaire/components/Questionnaire.interaction.test.ts`
- Modify: `src/features/questionnaire/components/Questionnaire.motion.mount.tsx`
- Modify: `src/app/questionnaire/page.tsx`
- Modify: `src/styles/globals.css`
- Modify: `package.json`
- Modify: `bun.lock`
- Delete after replacement tests pass: `src/features/questionnaire/hooks/useQuestionnaire.ts`
- Delete after replacement tests pass: `src/features/questionnaire/hooks/useQuestionnaire.mount.tsx`
- Delete after replacement tests pass: `src/features/questionnaire/hooks/useQuestionnaire.test.ts`
- Keep only as test fixtures, with no runtime import: `src/features/questionnaire/data/mockQuestionnaire.ts`
- Retire after reducer/storage coverage replaces it: `src/features/questionnaire/api/questionnaire.api.ts`
- Retire after reducer/storage coverage replaces it: `src/features/questionnaire/api/questionnaire.api.test.ts`

**Interfaces:**
- Consumes: Tasks 3–7 questionnaire model, reducer, storage, server gateway, browser client, and composers.
- Produces: `Questionnaire` props `{formToken, initialQuestionnaire, client?, storage?, timings?}`, `useQuestionnaireController`, tokenless missing-link UI, and dynamic server-loaded questionnaire page.

- [ ] **Step 1: Write failing controller tests for fresh start, resume, language, and completion retry**

```tsx
test("fresh visit opens language selection and starts without an answer request", async () => {
  const client = fakeClient();
  const harness = await mountController({ initialQuestionnaire: questionnaireEn, client });
  expect(harness.current.view).toBe("opening");
  await act(async () => harness.current.start("en"));
  expect(harness.current.view).toBe("conversation");
  expect(client.loadLanguageCalls).toEqual([]);
  expect(client.submitCalls).toEqual([]);
});

test("Spanish selection loads once before starting and persists language", async () => {
  const client = fakeClient({ es: questionnaireEs });
  const harness = await mountController({ initialQuestionnaire: questionnaireEn, client });
  await act(async () => harness.current.start("es"));
  expect(client.loadLanguageCalls).toEqual(["es"]);
  expect(readDraft(FORM_TOKEN, harness.storage)?.language).toBe("es");
});

test("resumed Spanish draft bypasses opening without flashing English", async () => {
  const storage = storageWith(spanishDraft);
  const client = fakeClient({ es: questionnaireEs });
  const harness = await mountController({ initialQuestionnaire: questionnaireEn, client, storage });
  await waitFor(() => harness.current.view === "conversation");
  expect(harness.current.result?.questionnaire.language).toBe("es");
  expect(client.loadLanguageCalls).toEqual(["es"]);
});

test("failed final submission keeps one key and every answer for retry", async () => {
  const client = fakeClient({ submitFailures: 1 });
  const harness = await mountFullyAnsweredController(client);
  await expect(harness.current.completeQuestionnaire()).rejects.toThrow();
  const firstKey = readDraft(FORM_TOKEN, harness.storage)?.submissionId;
  await act(async () => harness.current.completeQuestionnaire());
  expect(client.submitCalls.map((call) => call.submissionId)).toEqual([firstKey, firstKey]);
  expect(readDraft(FORM_TOKEN, harness.storage)?.status).toBe("completed");
});
```

- [ ] **Step 2: Write failing page tests**

```tsx
test("tokenless questionnaire explains how to enter", () => {
  const html = renderToStaticMarkup(<QuestionnairePage />);
  expect(html).toContain("Open your event link");
});

test("event page is dynamic, private, and renders a server-loaded definition", async () => {
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json(backendFormEn)) as typeof fetch;
  try {
    const html = renderToStaticMarkup(
      await EventQuestionnairePage({
        params: Promise.resolve({ formToken: "token-valid-123456" }),
      }),
    );
    expect(html).toContain("Mixer");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

- [ ] **Step 3: Run controller/page tests and confirm missing-module failures**

```bash
rtk bun test src/features/questionnaire/hooks/useQuestionnaireController.test.tsx 'src/app/questionnaire/[formToken]/page.test.tsx'
```

Expected: missing controller/components/page failures.

- [ ] **Step 4: Implement hydration and local commits in the controller**

The hook owns a ref-backed commit helper so it can return the exact next derived result to the existing animation flow:

```ts
function commit(action: QuestionnaireAction): QuestionnaireResult {
  const next = questionnaireReducer(stateRef.current, action);
  stateRef.current = next;
  setState(next);
  if (next.status === "completed") {
    writeCompleted(formToken, next, storage);
  } else {
    writeDraft(formToken, toDraftRecord(next), storage);
  }
  return selectQuestionnaireResult(next);
}
```

On mount, read storage in an effect and keep `view: "hydrating"` until it resolves. Completed records produce `completed` even if the event no longer accepts new submissions. Fresh or incomplete records produce `unavailable` when `acceptingSubmissions` is false. Otherwise fresh records produce `opening` and valid incomplete records produce `conversation`. If an incomplete stored language differs from the initial definition, await `client.loadLanguage()` before exposing the conversation. If either the initial or alternate-language definition is not accepting submissions, keep the draft and expose `unavailable` rather than entering conversation.

Expose these exact operations:

```ts
type QuestionnaireController = {
  view: "hydrating" | "opening" | "conversation" | "completed" | "unavailable";
  result: QuestionnaireResult | null;
  error: QuestionnaireClientErrorData | null;
  start(language: Language): Promise<void>;
  submitAnswer(input: SubmitAnswerInput): Promise<QuestionnaireResult>;
  completeQuestionnaire(): Promise<QuestionnaireResult>;
  retryCompletion(): Promise<QuestionnaireResult>;
};
```

`submitAnswer()` is local only. `completeQuestionnaire()` builds the Task 4 payload and calls the Task 6 client once. On success it writes the completed record; on failure it leaves the draft and UUID unchanged.

- [ ] **Step 5: Extract the existing animation flow and add the opening/notice shells**

Move the current `QuestionnaireFlow` implementation from `Questionnaire.tsx` into `QuestionnaireFlow.tsx` with the same timing contract. Replace hard-coded English action/error strings with `messagesFor(result.questionnaire.language)`.

`QuestionnaireOpening` renders event name, the two language buttons, and one start action. The control is never passed to `QuestionnaireFlow`, ensuring it cannot appear mid-conversation. `QuestionnaireNotice` renders only safe localized states and retry actions.

`QuestionnaireCompletion` accepts `{eventName, language}` and renders only the two localized completion messages. It is used when a completed record is restored after refresh because personal answers were deliberately removed from storage; it never fetches the non-default definition or reconstructs old answers.

Keep the feature shell declarative:

```tsx
if (controller.view === "hydrating") return <QuestionnaireNotice kind="loading" language={initialQuestionnaire.language} />;
if (controller.view === "opening") {
  return <QuestionnaireOpening questionnaire={initialQuestionnaire} onStart={controller.start} />;
}
if (controller.view === "completed") {
  return <QuestionnaireCompletion eventName={initialQuestionnaire.eventName} language={controller.language} />;
}
if (controller.view === "unavailable" || !controller.result) {
  return <QuestionnaireNotice kind="notAccepting" language={controller.language} />;
}
return (
  <QuestionnaireFlow
    result={controller.result}
    submitAnswer={controller.submitAnswer}
    completeQuestionnaire={controller.completeQuestionnaire}
    timings={resolvedTimings}
  />
);
```

Update the existing interaction and motion harnesses in the same task to inject `formToken`, `initialQuestionnaire`, the memory storage, and a fake `QuestionnaireClient`. Preserve their current timing, resume, submission-failure, and typewriter assertions before Task 9 expands them to all 17 questions and both languages.

The new shell signature is:

```ts
export type QuestionnaireProps = {
  formToken: string;
  initialQuestionnaire: Questionnaire;
  client?: QuestionnaireClient;
  storage?: QuestionnaireStorage;
  timings?: Partial<QuestionnaireTimings>;
};
```

Remove `QueryClientProvider`; React Query is not used for local conversation state.

- [ ] **Step 6: Implement the two page routes**

Tokenless `src/app/questionnaire/page.tsx` renders `QuestionnaireNotice` with English missing-link copy.

Dynamic page:

```tsx
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Attendee questionnaire | Weft",
  description: "Tell Weft who you would genuinely like to meet at the event.",
  robots: { index: false, follow: false },
};

export default async function EventQuestionnairePage({
  params,
}: {
  params: Promise<{ formToken: string }>;
}) {
  const tokenResult = formTokenSchema.safeParse((await params).formToken);
  if (!tokenResult.success) return <QuestionnaireNotice kind="invalidLink" language="en" />;
  const outcome = await loadQuestionnaire(tokenResult.data);
  if (outcome.status !== "ok") {
    return <QuestionnaireNotice kind={outcome.status} language="en" />;
  }
  return (
    <Questionnaire
      formToken={tokenResult.data}
      initialQuestionnaire={outcome.questionnaire}
    />
  );
}
```

Do not short-circuit `acceptingSubmissions` in the Server Component: only the client can see a same-browser completed record, and completion must still restore after the event closes. The controller applies availability after hydration.

- [ ] **Step 7: Pass controller/page tests, retire mock runtime modules, and commit**

Only delete the old API/hook files after their replacement tests pass and `rtk grep -n "questionnaire.api\|useQuestionnaire" src` shows no production import.

After the old hook is removed, confirm `rtk grep -n "@tanstack/react-query" src` returns zero matches, then remove the unused package:

```bash
rtk bun remove @tanstack/react-query
```

```bash
rtk bun test src/features/questionnaire/hooks/useQuestionnaireController.test.tsx 'src/app/questionnaire/[formToken]/page.test.tsx' src/features/questionnaire/components/Questionnaire.interaction.test.ts src/features/questionnaire/components/Questionnaire.layout.test.ts
rtk tsc --noEmit
rtk git add package.json bun.lock src/app/questionnaire/page.tsx 'src/app/questionnaire/[formToken]/page.tsx' 'src/app/questionnaire/[formToken]/page.test.tsx' src/features/questionnaire/hooks src/features/questionnaire/components/Questionnaire.tsx src/features/questionnaire/components/Questionnaire.interaction.mount.tsx src/features/questionnaire/components/Questionnaire.interaction.test.ts src/features/questionnaire/components/Questionnaire.motion.mount.tsx src/features/questionnaire/components/QuestionnaireFlow.tsx src/features/questionnaire/components/QuestionnaireOpening.tsx src/features/questionnaire/components/QuestionnaireCompletion.tsx src/features/questionnaire/components/QuestionnaireNotice.tsx src/styles/globals.css src/features/questionnaire/api/questionnaire.api.ts src/features/questionnaire/api/questionnaire.api.test.ts
rtk git commit -m "feat(questionnaire): wire event form conversation"
```

---

### Task 9: Cover Full Bilingual Flow, Resume, and Corrective Failures

**Repository:** `weft-web`

**Files:**
- Modify: `src/features/questionnaire/components/Questionnaire.interaction.mount.tsx`
- Modify: `src/features/questionnaire/components/Questionnaire.interaction.test.ts`
- Modify: `src/features/questionnaire/components/Questionnaire.motion.mount.tsx`
- Modify: `src/features/questionnaire/model/questionnaire.reducer.ts`
- Modify: `src/features/questionnaire/model/questionnaire.reducer.test.ts`
- Modify: `src/features/questionnaire/hooks/useQuestionnaireController.ts`
- Modify: `src/features/questionnaire/hooks/useQuestionnaireController.test.tsx`
- Modify: `src/features/questionnaire/components/Conversation.tsx`
- Modify: `src/features/questionnaire/components/Conversation.test.ts`

**Interfaces:**
- Consumes: complete integrated frontend from Tasks 3–8.
- Produces: verified 17-question English/Spanish journeys, correction mode for field-specific `422`, version-reset behavior, stable idempotent retry, and no language/message replay regressions.

- [ ] **Step 1: Replace the five-question mock interaction with the exact backend-shaped journey**

Drive all fields in order with these values:

```ts
const COMPLETE_ANSWERS = {
  name: "Ana",
  email: null,
  phone: "+57 300 000 0000",
  company: "Weft",
  t1: "Raise a seed round for my fintech",
  t2: "An angel who knows LatAm fintech",
  s1_situation: "own_business",
  s1_function: "engineering_product",
  s2: 3,
  s3: "up",
  s4: ["raise_capital"],
  s5: ["experience"],
  s6: 2,
  s7: 2,
  s8: 1,
  s9: 3,
  s10: 3,
} as const;
```

Run the journey once with `backendFormEn` and once with `backendFormEs`. Assert 17 attendee-answer items, localized completion messages, exactly one final client call, no per-answer client calls, and no language control after start.

- [ ] **Step 2: Add refresh and completion privacy tests**

Test refresh after at least one numeric choice and one skipped optional value. Assert the restored composer is the correct next question, old Weft messages do not animate, numeric display uses the localized option label, and storage contains the draft answers but never `attendee_token`.

After success, assert the stored completed record contains only `schemaVersion`, `formVersion`, `language`, `status`, and `updatedAt`, and a remount restores completion without resubmitting.

- [ ] **Step 3: Add failing correction and version-reset tests**

```ts
test("field validation correction retains all other answers", () => {
  const failed = questionnaireReducer(fullyAnsweredState, {
    type: "submissionFailed",
    error: { code: "validation", field: "email" },
  });
  expect(failed.correctionQuestionId).toBe("email");
  expect(failed.answers.name).toBe("Ana");
  expect(failed.answers.s10).toBe(3);
  const corrected = questionnaireReducer(failed, {
    type: "answerAccepted",
    questionId: "email",
    value: "ana@example.com",
  });
  expect(corrected.answers.email).toBe("ana@example.com");
  expect(corrected.currentQuestionIndex).toBe(17);
});

test("version conflict reloads the selected language and resets incomplete state", async () => {
  const client = fakeClient({
    submitError: { code: "versionConflict" },
    es: questionnaireEsV2,
  });
  const harness = await mountFullyAnsweredController(client, spanishDraft);
  await expect(harness.current.completeQuestionnaire()).rejects.toThrow();
  await waitFor(() => harness.current.view === "opening");
  expect(client.loadLanguageCalls).toEqual(["es"]);
  expect(harness.current.result?.questionnaire.version).toBe("v2");
  expect(harness.current.result?.session.answers).toEqual({});
});
```

- [ ] **Step 4: Implement correction mode without discarding unrelated answers**

When a validation failure names a real question, set `correctionQuestionId` and derive that question as the active question appended at the end of the existing conversation. `answerAccepted` in correction mode replaces only that field, clears correction mode, returns `currentQuestionIndex` to `questions.length`, and lets `QuestionnaireFlow` retry completion. Do not expose backward navigation for normal answers.

```ts
if (state.correctionQuestionId === action.questionId) {
  return {
    ...state,
    answers: { ...state.answers, [action.questionId]: parsedAnswer },
    currentQuestionIndex: state.questionnaire.questions.length,
    correctionQuestionId: null,
    submissionError: null,
    status: "active",
  };
}
```

When the failure is `versionConflict`, call `loadLanguage(formToken, currentLanguage)`, generate a new UUID, clear the incomplete answers, persist the new version, set `resetReason: "versionChanged"`, and return to the opening screen. Completed records never reset.

For `idempotencyConflict`, preserve all answers and the existing UUID; show the localized non-destructive error and do not invent a key automatically.

- [ ] **Step 5: Re-run interaction, motion, layout, and accessibility regressions**

```bash
rtk bun test src/features/questionnaire/components/Questionnaire.interaction.test.ts src/features/questionnaire/components/Questionnaire.layout.test.ts src/features/questionnaire/components/Conversation.test.ts src/features/questionnaire/components/ConversationItem.test.tsx src/features/questionnaire/components/TypewriterMessage.test.tsx src/features/questionnaire/hooks/useQuestionnaireController.test.tsx src/features/questionnaire/model/questionnaire.reducer.test.ts
rtk tsc --noEmit
```

Expected: both bilingual journeys and all existing motion/resume/accessibility regressions pass.

- [ ] **Step 6: Commit interaction hardening**

```bash
rtk git add src/features/questionnaire/components/Questionnaire.interaction.mount.tsx src/features/questionnaire/components/Questionnaire.interaction.test.ts src/features/questionnaire/components/Questionnaire.motion.mount.tsx src/features/questionnaire/model/questionnaire.reducer.ts src/features/questionnaire/model/questionnaire.reducer.test.ts src/features/questionnaire/hooks/useQuestionnaireController.ts src/features/questionnaire/hooks/useQuestionnaireController.test.tsx src/features/questionnaire/components/Conversation.tsx src/features/questionnaire/components/Conversation.test.ts
rtk git commit -m "test(questionnaire): cover bilingual B2B journey"
```

---

### Task 10: Run Cross-Repository Verification and the Two-Service Smoke Test

**Repositories:** `weft-b2b-backend`, then `weft-web`

**Files:**
- Modify only if verification exposes a documented defect: the exact file and its focused regression test from Tasks 1–9.
- No new feature scope is authorized in this task.

**Interfaces:**
- Consumes: all prior task deliverables.
- Produces: migration evidence, green non-live suites, production frontend build, and a manually verified real event submission/replay.

- [ ] **Step 1: Verify the complete backend**

From `weft-b2b-backend`:

```bash
rtk uv run alembic current
rtk uv run pytest
rtk uv run ruff check app tests
rtk git diff --check
rtk git status --short
```

Expected: Alembic reports `a63d4e21f9c7 (head)`; all non-live tests pass; Ruff and diff checks are clean; only intentional commits exist.

- [ ] **Step 2: Verify the complete frontend**

From `weft-web`:

```bash
rtk bun test
rtk bun run lint
rtk bun run build
rtk git diff --check
rtk git status --short
```

Expected: all tests pass, ESLint reports no errors, Next.js 16.2.11 production build succeeds, and the worktree is clean.

- [ ] **Step 3: Start both services with production-shaped local configuration**

Backend terminal, from `weft-b2b-backend`:

```bash
rtk uv run uvicorn app.main:create_app --factory --reload
```

Worker terminal, from `weft-b2b-backend`:

```bash
rtk uv run procrastinate --app=app.workers.app.proc_app worker
```

Frontend terminal, from `weft-web`, with `.env.local` containing `WEFT_B2B_API_URL=http://localhost:8000` while preserving existing B2C variables:

```bash
rtk bun run dev
```

- [ ] **Step 4: Perform the real event smoke test**

Use an organizer-created event token from the backend API and verify in the browser:

1. `/questionnaire/{formToken}` renders the event name and organizer-default language.
2. English completes all 17 fields; optional email can be skipped; numeric answers remain accepted.
3. Spanish loads before conversation and every backend question plus UI action is Spanish.
4. Refresh after several answers resumes at the next question without replaying old typewriter messages.
5. Block the final response after FastAPI receives it, then retry; the UI completes and the database contains one attendee, one response, and one encode job for the UUID.
6. Inspect Application Storage and the submit response; neither contains `attendee_token`. Confirm the attendee cookie is HttpOnly and `SameSite=Lax`.
7. `/questionnaire` shows missing-link guidance, an invalid token shows invalid-link guidance, and a non-submittable event never enters conversation.
8. Reopen the completed URL on the same browser; completion restores without another POST.

- [ ] **Step 5: Record final evidence without adding unrequested scope**

Report the exact backend test count, frontend test count, Ruff/ESLint/build results, migration head, smoke-test result, and the commit hashes from both repositories. If a verification failure requires a fix, add a focused failing regression test, make the smallest correction, rerun the affected task checks plus the full suite, and commit in the affected repository before reporting completion.

---

## Execution Notes

- Backend Tasks 1–2 must land before frontend Task 5 is accepted against the real API.
- Frontend Tasks 3 and 4 can be implemented after Task 1's contract is fixed; Tasks 5–9 depend on their exact interfaces.
- Do not point the B2C `weftApi.ts` helper at `weft-b2b-backend`; the two backend contracts intentionally remain isolated.
- Do not remove the current visual/motion behavior while replacing its state source. Extract `QuestionnaireFlow` with regression tests before deleting the mock API/hook.
- Each repository receives its own commits. Never stage files from both repositories in one commit operation.
