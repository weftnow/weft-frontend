# Organizer Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build secure, branded organizer registration and login, persist the organizer's role in FastAPI, and land authenticated organizers on a protected dashboard placeholder.

**Architecture:** Extend the FastAPI organizer registration contract with a required role while keeping legacy database rows nullable. In Next.js, keep the auth experience inside `src/features/organizer-auth`, proxy browser mutations through validated same-origin Route Handlers, store the opaque FastAPI JWT in an HttpOnly cookie, and validate that cookie server-side before rendering `/organizer`.

**Tech Stack:** Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2, Alembic, PostgreSQL, pytest, Next.js 16.2 App Router, React 19, TypeScript 5, Zod 4, Motion 12, Tailwind CSS 4, CSS Modules, Bun test, and JSDOM.

## Global Constraints

- Frontend repository: `/Users/antoniopertuz/Documents/surnx/weft-web`.
- Backend repository: `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend`.
- Preserve unrelated backend untracked directories `.claude/` and `.serena/` plus the conflicting untracked `docs/superpowers/plans/2026-08-09-organizer-role-field.md`; never edit or stage them.
- The committed backend document `docs/superpowers/specs/2026-08-09-organizer-role-field-design.md` predates the latest cross-repository approval: it requires `role_other` and a blank non-null legacy role. Task 1 updates that document to the current source of truth: no `role_other`, nullable legacy role, required canonical role for new registration.
- Prefix every shell command with `rtk`; run commands from the repository named by each step.
- Follow the bundled Next.js 16.2 documentation in `node_modules/next/dist/docs/`; `cookies()` and route `params` are asynchronous.
- Add no dependency and no design-system package.
- Keep frontend organizer-auth source under `src/features/organizer-auth`; keep App Router pages and Route Handlers thin.
- Registration has exactly five question screens in this order: `contact_name`, `organization_name`, `role`, `email`, `password`.
- Login shows email and password together on one screen.
- Language is a persistent top selector, not a registration step; registration sends the selected `default_language`.
- Supported role values are exactly `founder`, `community_manager`, `event_manager`, `operations`, `marketing_lead`, and `other`.
- English role labels are exactly `Founder`, `Community Manager`, `Event Manager`, `Operations`, `Marketing lead`, and `Other`.
- Do not collect or send WhatsApp; do not reveal a free-text field for `other`.
- Capture browser timezone silently and fall back to `UTC`.
- Store the JWT only in `weft_organizer_session` with HttpOnly, SameSite Lax, root path, production Secure, and seven-day Max-Age attributes.
- Never return the JWT to browser JavaScript and never log email, password, role payload, JWT, or upstream details.
- Use `Cache-Control: no-store` on auth and protected-dashboard traffic.
- Use the current Comfortaa, Geist Mono, bone, ink, ember, signal, logo, radius, focus, and ambient-texture language.
- Prompt animation follows the hero's per-character clip, opacity, and vertical-rise motion; it honors reduced motion and animates only transform, opacity, and clip-path.
- The successful dashboard copy is exactly lowercase: `your event data will appear here`.
- Do not add dashboard data, event UI, logout, password reset, email verification, social login, refresh tokens, MFA, draft persistence, or public landing-navigation changes.
- Design source: `docs/superpowers/specs/2026-08-09-organizer-auth-design.md`.

## Planned File Structure

### Backend repository

| File | Responsibility |
| --- | --- |
| `docs/superpowers/specs/2026-08-09-organizer-role-field-design.md` | Reconcile the older backend-only role design with the latest approved cross-repository contract. |
| `app/db/models/core.py` | Add nullable persisted `Organizer.role`. |
| `app/db/migrations/versions/c9a4f2e18d73_organizer_role.py` | Merge the two current Alembic heads and add/drop the nullable role column. |
| `app/schemas/auth.py` | Define `OrganizerRole`, require it at registration, expose nullable legacy role. |
| `app/api/v1/auth.py` | Copy the validated role into the organizer row. |
| `tests/test_auth.py` | Cover required, supported, unsupported, stored, and returned roles. |
| `tests/test_events.py` | Keep the existing registration helper valid by supplying a role. |
| `tests/test_forms.py` | Keep the existing registration helper valid by supplying a role. |
| `tests/test_organizer_role_migration.py` | Prove the migration joins both heads and adds a nullable column with no guessed default. |

### Frontend repository

| File | Responsibility |
| --- | --- |
| `src/features/organizer-auth/types/organizerAuth.types.ts` | Canonical languages, roles, fields, steps, DTOs, and safe failures. |
| `src/features/organizer-auth/schemas/organizerAuth.schema.ts` | Zod validation, field validation, DTO mapping, timezone resolution. |
| `src/features/organizer-auth/schemas/organizerAuth.schema.test.ts` | Contract and mapping tests. |
| `src/features/organizer-auth/i18n/organizerAuth.messages.ts` | Complete English and Spanish auth copy and localized role labels. |
| `src/features/organizer-auth/i18n/organizerAuth.messages.test.ts` | Copy completeness and canonical-role mapping tests. |
| `src/features/organizer-auth/model/registration.reducer.ts` | Five-step state transitions, answer preservation, submission/error state. |
| `src/features/organizer-auth/model/registration.reducer.test.ts` | Order, back, language, and server-field recovery tests. |
| `src/features/organizer-auth/api/server/organizerAuth.gateway.ts` | FastAPI register, login, and session-validation transport. |
| `src/features/organizer-auth/api/server/organizerAuth.gateway.test.ts` | Exact request, parsing, timeout, and safe failure tests. |
| `src/features/organizer-auth/api/server/organizerSession.ts` | Cookie name/options, cookie setting, and request-cookie reading. |
| `src/features/organizer-auth/api/server/organizerSession.test.ts` | Cookie attribute tests without a Next request context. |
| `src/features/organizer-auth/api/client/organizerAuth.client.ts` | Browser register/login client and safe error decoding. |
| `src/features/organizer-auth/api/client/organizerAuth.client.test.ts` | Browser request and failure tests. |
| `src/app/api/organizer-auth/_lib/response.ts` | Safe public error response mapping. |
| `src/app/api/organizer-auth/register/route.ts` | Validate browser registration, call gateway, set cookie. |
| `src/app/api/organizer-auth/register/route.test.ts` | Registration BFF boundary tests. |
| `src/app/api/organizer-auth/login/route.ts` | Validate browser login, call gateway, set cookie. |
| `src/app/api/organizer-auth/login/route.test.ts` | Login BFF boundary tests. |
| `src/features/organizer-auth/components/OrganizerAuth.module.css` | Feature-owned branded, responsive, reduced-motion presentation. |
| `src/features/organizer-auth/components/AuthShell.tsx` | Shared viewport shell, logo, language selector, and ambient layers. |
| `src/features/organizer-auth/components/LanguageSelector.tsx` | Accessible persistent English/Spanish selector. |
| `src/features/organizer-auth/components/AnimatedPrompt.tsx` | Hero-derived, accessible per-character prompt reveal. |
| `src/features/organizer-auth/components/AnimatedPrompt.test.tsx` | Static semantics and character-markup tests. |
| `src/features/organizer-auth/components/AnimatedPrompt.mount.tsx` | Real DOM progressive and reduced-motion tests. |
| `src/features/organizer-auth/components/AnimatedPrompt.interaction.test.ts` | Isolated mount-suite launcher. |
| `src/features/organizer-auth/components/RoleOptions.tsx` | Accessible role radio group with no `other` text field. |
| `src/features/organizer-auth/components/RegistrationQuestion.tsx` | Render the active field's prompt and answer control. |
| `src/features/organizer-auth/components/RegisterFlow.tsx` | Registration orchestration, per-step validation, submission, recovery. |
| `src/features/organizer-auth/components/RegisterFlow.mount.tsx` | Full registration DOM interaction tests. |
| `src/features/organizer-auth/components/RegisterFlow.interaction.test.ts` | Isolated registration mount-suite launcher. |
| `src/features/organizer-auth/components/LoginForm.tsx` | Single-screen localized login and guarded submission. |
| `src/features/organizer-auth/components/LoginForm.mount.tsx` | Login DOM interaction tests. |
| `src/features/organizer-auth/components/LoginForm.interaction.test.ts` | Isolated login mount-suite launcher. |
| `src/app/organizer/register/page.tsx` | Private registration route and metadata. |
| `src/app/organizer/register/page.test.tsx` | Registration page composition and metadata tests. |
| `src/app/organizer/login/page.tsx` | Private login route and metadata. |
| `src/app/organizer/login/page.test.tsx` | Login page composition and metadata tests. |
| `src/features/organizer-auth/model/organizerPage.model.ts` | Pure protected-page decision mapping. |
| `src/features/organizer-auth/model/organizerPage.model.test.ts` | Missing, valid, invalid, and unavailable session decisions. |
| `src/app/organizer/page.tsx` | Dynamic protected placeholder page. |
| `src/app/organizer/page.test.tsx` | Exact placeholder and unavailable presentation tests. |
| `tests/architecture.test.ts` | Enforce the organizer-auth feature and boundary placement. |

---

### Task 1: Persist Organizer Role in FastAPI

**Repository:** `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend`

**Files:**
- Modify: `docs/superpowers/specs/2026-08-09-organizer-role-field-design.md`
- Create: `app/db/migrations/versions/c9a4f2e18d73_organizer_role.py`
- Create: `tests/test_organizer_role_migration.py`
- Modify: `app/db/models/core.py`
- Modify: `app/schemas/auth.py`
- Modify: `app/api/v1/auth.py`
- Modify: `tests/test_auth.py`
- Modify: `tests/test_events.py`
- Modify: `tests/test_forms.py`

**Interfaces:**
- Consumes: existing `POST /v1/auth/register`, `Organizer`, `RegisterRequest`, `OrganizerOut`, and the current Alembic heads `a63d4e21f9c7` plus `b8d4e1a06c72`.
- Produces: `OrganizerRole = Literal["founder", "community_manager", "event_manager", "operations", "marketing_lead", "other"]`; required `RegisterRequest.role`; nullable `OrganizerOut.role`; nullable database column `organizers.role`; one Alembic head `c9a4f2e18d73`.

- [ ] **Step 1: Reconcile the older backend-only design document**

Update `docs/superpowers/specs/2026-08-09-organizer-role-field-design.md` before changing code so the backend no longer carries a contradictory approved contract:

- Delete every `role_other` field, validator, migration, output, and test requirement.
- State that choosing `other` is complete by itself and collects no free text in this scope.
- Change the model contract to `role: Mapped[str | None]` with a nullable column and no server default.
- Change `OrganizerOut.role` to `OrganizerRole | None` for legacy rows while keeping `RegisterRequest.role: OrganizerRole` required.
- Replace the empty-string legacy rationale with `NULL`, because absence is unknown data and must not masquerade as a role.
- Add the six supported-role test matrix and the two current Alembic heads.
- Reference the cross-repository design at `/Users/antoniopertuz/Documents/surnx/weft-web/docs/superpowers/specs/2026-08-09-organizer-auth-design.md` as the product source of truth.

Do not modify the untracked older implementation plan at `docs/superpowers/plans/2026-08-09-organizer-role-field.md`; it is pre-existing user work and must remain untouched.

- [ ] **Step 2: Make the auth contract tests require and exercise role**

Add `import pytest` to `tests/test_auth.py`, add a canonical role to the shared payload, and add the exact role tests:

```python
import pytest


ROLES = (
    "founder",
    "community_manager",
    "event_manager",
    "operations",
    "marketing_lead",
    "other",
)

REGISTRATION = {
    "email": "a@b.co",
    "password": "longenough",
    "contact_name": "Ana Restrepo",
    "organization_name": "Acme Ventures",
    "role": "event_manager",
}


async def test_role_is_required_for_new_registration(client):
    payload = {key: value for key, value in REGISTRATION.items() if key != "role"}
    response = await client.post("/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.parametrize("role", ROLES)
async def test_registration_stores_and_returns_each_supported_role(client, role):
    payload = {**REGISTRATION, "email": f"{role}@example.com", "role": role}
    response = await client.post("/v1/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["organizer"]["role"] == role


async def test_registration_rejects_an_unsupported_role(client):
    response = await client.post(
        "/v1/auth/register",
        json={**REGISTRATION, "role": "chief_vibes_officer"},
    )
    assert response.status_code == 422
```

In `test_registration_stores_the_profile_and_never_returns_the_hash`, also assert:

```python
assert org["role"] == "event_manager"
```

- [ ] **Step 3: Add a migration-shape test that prevents a guessed legacy role**

Create `tests/test_organizer_role_migration.py`:

```python
import importlib


def test_role_migration_merges_both_heads_and_adds_a_nullable_column(monkeypatch):
    migration = importlib.import_module(
        "app.db.migrations.versions.c9a4f2e18d73_organizer_role"
    )
    added: list[tuple[str, object]] = []
    monkeypatch.setattr(
        migration.op,
        "add_column",
        lambda table, column: added.append((table, column)),
    )

    migration.upgrade()

    assert set(migration.down_revision) == {
        "a63d4e21f9c7",
        "b8d4e1a06c72",
    }
    assert len(added) == 1
    table, column = added[0]
    assert table == "organizers"
    assert column.name == "role"
    assert column.nullable is True
    assert column.server_default is None


def test_role_migration_downgrade_drops_only_the_role_column(monkeypatch):
    migration = importlib.import_module(
        "app.db.migrations.versions.c9a4f2e18d73_organizer_role"
    )
    dropped: list[tuple[str, str]] = []
    monkeypatch.setattr(
        migration.op,
        "drop_column",
        lambda table, column: dropped.append((table, column)),
    )

    migration.downgrade()

    assert dropped == [("organizers", "role")]
```

- [ ] **Step 4: Run the new tests and confirm the contract is red**

Run:

```bash
rtk proxy env UV_CACHE_DIR=/tmp/weft-b2b-uv-cache uv run pytest tests/test_auth.py tests/test_organizer_role_migration.py -q
```

Expected: failures show that registration currently accepts no `role`, organizer output has no `role`, and the migration module does not exist.

- [ ] **Step 5: Add the nullable model and converging migration**

Add to `Organizer` in `app/db/models/core.py`, immediately after `organization_name`:

```python
role: Mapped[str | None] = mapped_column(String(40), nullable=True)
```

Create `app/db/migrations/versions/c9a4f2e18d73_organizer_role.py`:

```python
"""organizer role and migration-head convergence

Revision ID: c9a4f2e18d73
Revises: a63d4e21f9c7, b8d4e1a06c72
Create Date: 2026-08-09

Role is nullable for existing organizers because assigning a guessed role
would make legacy profile data false. New registration requires a role at the
Pydantic boundary. This revision also converges the repository's two current
heads so `alembic upgrade head` is unambiguous again.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9a4f2e18d73"
down_revision: str | Sequence[str] | None = (
    "a63d4e21f9c7",
    "b8d4e1a06c72",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "organizers",
        sa.Column("role", sa.String(length=40), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizers", "role")
```

- [ ] **Step 6: Extend the auth schema and registration write**

In `app/schemas/auth.py`, define the role beside `Language`:

```python
OrganizerRole = Literal[
    "founder",
    "community_manager",
    "event_manager",
    "operations",
    "marketing_lead",
    "other",
]
```

Add the required request field and nullable legacy output field:

```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    contact_name: str = Field(min_length=1, max_length=200)
    organization_name: str = Field(min_length=1, max_length=200)
    role: OrganizerRole
    timezone: str = "UTC"
    default_language: Language = "en"
    whatsapp: str | None = Field(default=None, max_length=40)
```

```python
class OrganizerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    contact_name: str
    organization_name: str
    role: OrganizerRole | None
    timezone: str
    default_language: str
    whatsapp: str | None
```

In `app/api/v1/auth.py`, add the validated value to the `Organizer` constructor:

```python
role=body.role,
```

- [ ] **Step 7: Keep existing backend registration helpers valid**

Add the same explicit fixture role to the JSON payloads in `tests/test_events.py` and `tests/test_forms.py`:

```python
"role": "event_manager",
```

Do not give `RegisterRequest.role` a default merely to avoid updating these helpers. The new product contract intentionally requires the question.

- [ ] **Step 8: Run focused backend tests and migration checks**

Run:

```bash
rtk proxy env UV_CACHE_DIR=/tmp/weft-b2b-uv-cache uv run pytest tests/test_auth.py tests/test_organizer_role_migration.py tests/test_events.py tests/test_forms.py -q
rtk proxy env UV_CACHE_DIR=/tmp/weft-b2b-uv-cache uv run alembic heads
rtk proxy env UV_CACHE_DIR=/tmp/weft-b2b-uv-cache uv run ruff check app/db/models/core.py app/schemas/auth.py app/api/v1/auth.py app/db/migrations/versions/c9a4f2e18d73_organizer_role.py tests/test_auth.py tests/test_organizer_role_migration.py tests/test_events.py tests/test_forms.py
```

Expected: all focused tests pass, Ruff passes, and Alembic reports only `c9a4f2e18d73 (head)`.

- [ ] **Step 9: Commit the backend contract**

```bash
rtk git add docs/superpowers/specs/2026-08-09-organizer-role-field-design.md app/db/models/core.py app/schemas/auth.py app/api/v1/auth.py app/db/migrations/versions/c9a4f2e18d73_organizer_role.py tests/test_auth.py tests/test_organizer_role_migration.py tests/test_events.py tests/test_forms.py
rtk git commit -m "feat(auth): persist organizer role"
```

### Task 2: Define Frontend Contracts, Localization, and Registration State

**Repository:** `/Users/antoniopertuz/Documents/surnx/weft-web`

**Files:**
- Create: `src/features/organizer-auth/types/organizerAuth.types.ts`
- Create: `src/features/organizer-auth/schemas/organizerAuth.schema.ts`
- Create: `src/features/organizer-auth/schemas/organizerAuth.schema.test.ts`
- Create: `src/features/organizer-auth/i18n/organizerAuth.messages.ts`
- Create: `src/features/organizer-auth/i18n/organizerAuth.messages.test.ts`
- Create: `src/features/organizer-auth/model/registration.reducer.ts`
- Create: `src/features/organizer-auth/model/registration.reducer.test.ts`
- Modify: `tests/architecture.test.ts`

**Interfaces:**
- Consumes: backend role values from Task 1; Zod 4; the approved five-step order.
- Produces: `OrganizerLanguage`, `OrganizerRole`, `OrganizerAuthField`, `RegisterStep`, `RegistrationDraft`, `RegisterRequestDto`, `LoginRequestDto`, `OrganizerAuthFailureData`, `REGISTER_STEPS`, `organizerAuthMessages`, `registrationRequestSchema`, `loginRequestSchema`, `validateRegistrationStep`, `toRegisterRequest`, `resolveBrowserTimezone`, `createRegistrationState`, and `registrationReducer`.

- [ ] **Step 1: Add the architecture gate before creating feature files**

Append this test to `tests/architecture.test.ts`:

```ts
test("organizer auth owns its feature source and app boundaries", () => {
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/organizer-auth/types/organizerAuth.types.ts",
      ),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/organizer-auth/api/server/organizerAuth.gateway.ts",
      ),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/organizer-auth/components/RegisterFlow.tsx",
      ),
    ),
  ).toBe(true);
  expect(
    existsSync(resolve(projectRoot, "src/app/organizer/register/page.tsx")),
  ).toBe(true);
  expect(
    existsSync(
      resolve(projectRoot, "src/app/api/organizer-auth/register/route.ts"),
    ),
  ).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/components/organizer-auth"))).toBe(
    false,
  );
});
```

- [ ] **Step 2: Write contract and timezone tests**

Create `src/features/organizer-auth/schemas/organizerAuth.schema.test.ts` with these cases:

```ts
import { expect, test } from "bun:test";
import {
  loginRequestSchema,
  registrationRequestSchema,
  resolveBrowserTimezone,
  toRegisterRequest,
  validateRegistrationStep,
} from "./organizerAuth.schema";
import { ORGANIZER_ROLES } from "../types/organizerAuth.types";

const draft = {
  contactName: "  Ana Restrepo  ",
  organizationName: "  Weft Events  ",
  role: "event_manager" as const,
  email: "ana@example.com",
  password: "longenough",
};

test("registration accepts every canonical role and rejects unknown roles", () => {
  for (const role of ORGANIZER_ROLES) {
    expect(
      registrationRequestSchema.safeParse({
        contact_name: "Ana",
        organization_name: "Weft",
        role,
        email: "ana@example.com",
        password: "longenough",
        timezone: "America/Bogota",
        default_language: "en",
      }).success,
    ).toBe(true);
  }
  expect(
    registrationRequestSchema.safeParse({
      contact_name: "Ana",
      organization_name: "Weft",
      role: "chief_vibes_officer",
      email: "ana@example.com",
      password: "longenough",
      timezone: "UTC",
      default_language: "en",
    }).success,
  ).toBe(false);
});

test("DTO mapping trims names, includes language and timezone, and omits WhatsApp", () => {
  const payload = toRegisterRequest(draft, "es", "America/Bogota");
  expect(payload).toEqual({
    contact_name: "Ana Restrepo",
    organization_name: "Weft Events",
    role: "event_manager",
    email: "ana@example.com",
    password: "longenough",
    timezone: "America/Bogota",
    default_language: "es",
  });
  expect("whatsapp" in payload).toBe(false);
});

test("step validation rejects blanks, invalid email, and short passwords", () => {
  expect(validateRegistrationStep("contact_name", { ...draft, contactName: "   " })).toBeDefined();
  expect(validateRegistrationStep("organization_name", { ...draft, organizationName: "" })).toBeDefined();
  expect(validateRegistrationStep("role", { ...draft, role: null })).toBeDefined();
  expect(validateRegistrationStep("email", { ...draft, email: "not-email" })).toBeDefined();
  expect(validateRegistrationStep("password", { ...draft, password: "short" })).toBeDefined();
});

test("login requires a valid email and a non-empty password", () => {
  expect(loginRequestSchema.safeParse({ email: "ana@example.com", password: "x" }).success).toBe(true);
  expect(loginRequestSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
});

test("timezone resolution uses IANA output and falls back to UTC", () => {
  expect(resolveBrowserTimezone(() => "America/Bogota")).toBe("America/Bogota");
  expect(resolveBrowserTimezone(() => "")).toBe("UTC");
  expect(resolveBrowserTimezone(() => "Not/A_Real_Zone")).toBe("UTC");
  expect(
    resolveBrowserTimezone(() => {
      throw new Error("Intl unavailable");
    }),
  ).toBe("UTC");
});
```

- [ ] **Step 3: Write localization completeness tests**

Create `src/features/organizer-auth/i18n/organizerAuth.messages.test.ts`:

```ts
import { expect, test } from "bun:test";
import { organizerAuthMessages } from "./organizerAuth.messages";
import { ORGANIZER_ROLES, REGISTER_STEPS } from "../types/organizerAuth.types";

test("both languages cover every step and canonical role", () => {
  for (const language of ["en", "es"] as const) {
    const messages = organizerAuthMessages[language];
    expect(Object.keys(messages.registration.prompts)).toEqual([...REGISTER_STEPS]);
    expect(Object.keys(messages.roles)).toEqual([...ORGANIZER_ROLES]);
    expect(messages.login.emailLabel.length > 0).toBe(true);
    expect(messages.login.passwordLabel.length > 0).toBe(true);
    expect(messages.errors.unavailable.length > 0).toBe(true);
  }
});

test("approved English role labels remain exact", () => {
  expect(organizerAuthMessages.en.roles).toEqual({
    founder: "Founder",
    community_manager: "Community Manager",
    event_manager: "Event Manager",
    operations: "Operations",
    marketing_lead: "Marketing lead",
    other: "Other",
  });
});
```

- [ ] **Step 4: Write reducer tests for the approved order and recovery**

Create `src/features/organizer-auth/model/registration.reducer.test.ts`:

```ts
import { expect, test } from "bun:test";
import {
  createRegistrationState,
  registrationReducer,
} from "./registration.reducer";
import { REGISTER_STEPS } from "../types/organizerAuth.types";

test("registration follows the approved five-step order", () => {
  let state = createRegistrationState();
  expect(REGISTER_STEPS).toEqual([
    "contact_name",
    "organization_name",
    "role",
    "email",
    "password",
  ]);
  for (let index = 1; index < REGISTER_STEPS.length; index += 1) {
    state = registrationReducer(state, { type: "next" });
    expect(state.stepIndex).toBe(index);
  }
  expect(registrationReducer(state, { type: "next" }).stepIndex).toBe(4);
});

test("back and language changes preserve entered answers", () => {
  let state = createRegistrationState();
  state = registrationReducer(state, {
    type: "setTextValue",
    field: "contactName",
    value: "Ana",
  });
  state = registrationReducer(state, { type: "next" });
  state = registrationReducer(state, { type: "setLanguage", language: "es" });
  state = registrationReducer(state, { type: "back" });
  expect(state.language).toBe("es");
  expect(state.draft.contactName).toBe("Ana");
  expect(state.stepIndex).toBe(0);
});

test("a server field failure returns to the affected step", () => {
  let state = createRegistrationState();
  for (let index = 1; index < REGISTER_STEPS.length; index += 1) {
    state = registrationReducer(state, { type: "next" });
  }
  state = registrationReducer(state, {
    type: "fieldFailure",
    field: "email",
    code: "email",
  });
  expect(state.stepIndex).toBe(3);
  expect(state.fieldError).toEqual({ field: "email", code: "email" });
  expect(state.status).toBe("idle");
});
```

- [ ] **Step 5: Run the new frontend tests and confirm red**

Run:

```bash
rtk bun test tests/architecture.test.ts src/features/organizer-auth/schemas/organizerAuth.schema.test.ts src/features/organizer-auth/i18n/organizerAuth.messages.test.ts src/features/organizer-auth/model/registration.reducer.test.ts
```

Expected: the feature files and imports do not exist, and the architecture gate fails.

- [ ] **Step 6: Implement canonical types and schemas**

Create `src/features/organizer-auth/types/organizerAuth.types.ts`:

```ts
export const ORGANIZER_LANGUAGES = ["en", "es"] as const;
export type OrganizerLanguage = (typeof ORGANIZER_LANGUAGES)[number];

export const ORGANIZER_ROLES = [
  "founder",
  "community_manager",
  "event_manager",
  "operations",
  "marketing_lead",
  "other",
] as const;
export type OrganizerRole = (typeof ORGANIZER_ROLES)[number];

export const REGISTER_STEPS = [
  "contact_name",
  "organization_name",
  "role",
  "email",
  "password",
] as const;
export type RegisterStep = (typeof REGISTER_STEPS)[number];

export const ORGANIZER_AUTH_FIELDS = [
  ...REGISTER_STEPS,
  "timezone",
  "default_language",
] as const;
export type OrganizerAuthField = (typeof ORGANIZER_AUTH_FIELDS)[number];

export type RegistrationDraft = {
  contactName: string;
  organizationName: string;
  role: OrganizerRole | null;
  email: string;
  password: string;
};

export type RegisterRequestDto = {
  contact_name: string;
  organization_name: string;
  role: OrganizerRole;
  email: string;
  password: string;
  timezone: string;
  default_language: OrganizerLanguage;
};

export type LoginRequestDto = { email: string; password: string };

export type OrganizerAuthFailureData =
  | { code: "validation"; field?: OrganizerAuthField }
  | { code: "emailAlreadyRegistered" }
  | { code: "invalidCredentials" }
  | { code: "unavailable" };
```

Create `src/features/organizer-auth/schemas/organizerAuth.schema.ts` with strict DTO schemas and mapping:

```ts
import { z } from "zod";
import {
  ORGANIZER_AUTH_FIELDS,
  ORGANIZER_LANGUAGES,
  ORGANIZER_ROLES,
  type LoginRequestDto,
  type OrganizerAuthField,
  type OrganizerLanguage,
  type RegisterRequestDto,
  type RegisterStep,
  type RegistrationDraft,
} from "../types/organizerAuth.types";

const trimmedName = z.string().trim().min(1).max(200);
const email = z.string().trim().email().max(320);
const role = z.enum(ORGANIZER_ROLES);
const language = z.enum(ORGANIZER_LANGUAGES);
const timezone = z.string().trim().min(1).max(64).refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
});

export const organizerAuthFieldSchema = z.enum(ORGANIZER_AUTH_FIELDS);

export const registrationRequestSchema = z.object({
  contact_name: trimmedName,
  organization_name: trimmedName,
  role,
  email,
  password: z.string().min(8),
  timezone,
  default_language: language,
}).strict();

export const loginRequestSchema = z.object({
  email,
  password: z.string().min(1),
}).strict();

const stepSchemas = {
  contact_name: trimmedName,
  organization_name: trimmedName,
  role,
  email,
  password: z.string().min(8),
} as const;

function stepValue(step: RegisterStep, draft: RegistrationDraft): unknown {
  if (step === "contact_name") return draft.contactName;
  if (step === "organization_name") return draft.organizationName;
  if (step === "role") return draft.role;
  return draft[step];
}

export function validateRegistrationStep(
  step: RegisterStep,
  draft: RegistrationDraft,
): RegisterStep | undefined {
  const result = stepSchemas[step].safeParse(stepValue(step, draft));
  return result.success ? undefined : step;
}

export function toRegisterRequest(
  draft: RegistrationDraft,
  selectedLanguage: OrganizerLanguage,
  timezone: string,
): RegisterRequestDto {
  return registrationRequestSchema.parse({
    contact_name: draft.contactName,
    organization_name: draft.organizationName,
    role: draft.role,
    email: draft.email,
    password: draft.password,
    timezone,
    default_language: selectedLanguage,
  });
}

export function toLoginRequest(emailValue: string, password: string): LoginRequestDto {
  return loginRequestSchema.parse({ email: emailValue, password });
}

export function resolveBrowserTimezone(
  readTimezone: () => string = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  try {
    const parsed = timezone.safeParse(readTimezone());
    return parsed.success ? parsed.data : "UTC";
  } catch {
    return "UTC";
  }
}

export function isOrganizerAuthField(value: unknown): value is OrganizerAuthField {
  return organizerAuthFieldSchema.safeParse(value).success;
}
```

- [ ] **Step 7: Implement complete bilingual copy**

Create `src/features/organizer-auth/i18n/organizerAuth.messages.ts`. Keep this object complete so components never branch on language:

```ts
import type {
  OrganizerLanguage,
  OrganizerRole,
  RegisterStep,
} from "../types/organizerAuth.types";

export type OrganizerAuthMessages = {
  languageLabel: string;
  english: string;
  spanish: string;
  registration: {
    prompts: Record<RegisterStep, string>;
    placeholders: Record<Exclude<RegisterStep, "role">, string>;
    progress: string;
    continue: string;
    back: string;
    submit: string;
    submitting: string;
    accountPrompt: string;
    loginLink: string;
  };
  roles: Record<OrganizerRole, string>;
  login: {
    title: string;
    emailLabel: string;
    passwordLabel: string;
    submit: string;
    submitting: string;
    newPrompt: string;
    registerLink: string;
  };
  errors: {
    contact_name: string;
    organization_name: string;
    role: string;
    email: string;
    password: string;
    emailAlreadyRegistered: string;
    invalidCredentials: string;
    unavailable: string;
  };
};

export const organizerAuthMessages: Record<
  OrganizerLanguage,
  OrganizerAuthMessages
> = {
  en: {
    languageLabel: "Language",
    english: "English",
    spanish: "Español",
    registration: {
      prompts: {
        contact_name: "What should we call you?",
        organization_name: "What organization are you hosting with?",
        role: "What's your role?",
        email: "What's your work email?",
        password: "Create a password.",
      },
      placeholders: {
        contact_name: "Your name",
        organization_name: "Organization name",
        email: "you@organization.com",
        password: "At least 8 characters",
      },
      progress: "Question {current} of {total}",
      continue: "Continue",
      back: "Back",
      submit: "Create account",
      submitting: "Creating account",
      accountPrompt: "Already have an account?",
      loginLink: "Sign in",
    },
    roles: {
      founder: "Founder",
      community_manager: "Community Manager",
      event_manager: "Event Manager",
      operations: "Operations",
      marketing_lead: "Marketing lead",
      other: "Other",
    },
    login: {
      title: "Welcome back.",
      emailLabel: "Work email",
      passwordLabel: "Password",
      submit: "Sign in",
      submitting: "Signing in",
      newPrompt: "New to Weft?",
      registerLink: "Create an account",
    },
    errors: {
      contact_name: "Enter your name.",
      organization_name: "Enter your organization name.",
      role: "Choose your role.",
      email: "Enter a valid work email.",
      password: "Use at least 8 characters.",
      emailAlreadyRegistered: "An account already exists for this email.",
      invalidCredentials: "The email or password is incorrect.",
      unavailable: "We couldn't reach Weft. Check your connection and try again.",
    },
  },
  es: {
    languageLabel: "Idioma",
    english: "English",
    spanish: "Español",
    registration: {
      prompts: {
        contact_name: "¿Cómo deberíamos llamarte?",
        organization_name: "¿Con qué organización haces tus eventos?",
        role: "¿Cuál es tu rol?",
        email: "¿Cuál es tu correo de trabajo?",
        password: "Crea una contraseña.",
      },
      placeholders: {
        contact_name: "Tu nombre",
        organization_name: "Nombre de la organización",
        email: "tu@organizacion.com",
        password: "Mínimo 8 caracteres",
      },
      progress: "Pregunta {current} de {total}",
      continue: "Continuar",
      back: "Atrás",
      submit: "Crear cuenta",
      submitting: "Creando cuenta",
      accountPrompt: "¿Ya tienes una cuenta?",
      loginLink: "Inicia sesión",
    },
    roles: {
      founder: "Fundador/a",
      community_manager: "Community Manager",
      event_manager: "Event Manager",
      operations: "Operaciones",
      marketing_lead: "Líder de marketing",
      other: "Otro",
    },
    login: {
      title: "Qué bueno verte de nuevo.",
      emailLabel: "Correo de trabajo",
      passwordLabel: "Contraseña",
      submit: "Iniciar sesión",
      submitting: "Iniciando sesión",
      newPrompt: "¿Primera vez en Weft?",
      registerLink: "Crea una cuenta",
    },
    errors: {
      contact_name: "Escribe tu nombre.",
      organization_name: "Escribe el nombre de tu organización.",
      role: "Elige tu rol.",
      email: "Escribe un correo de trabajo válido.",
      password: "Usa al menos 8 caracteres.",
      emailAlreadyRegistered: "Ya existe una cuenta con este correo.",
      invalidCredentials: "El correo o la contraseña son incorrectos.",
      unavailable: "No pudimos conectar con Weft. Revisa tu conexión e inténtalo de nuevo.",
    },
  },
};
```

- [ ] **Step 8: Implement the bounded reducer**

Create `src/features/organizer-auth/model/registration.reducer.ts`:

```ts
import {
  REGISTER_STEPS,
  type OrganizerLanguage,
  type OrganizerRole,
  type RegisterStep,
  type RegistrationDraft,
} from "../types/organizerAuth.types";

export type DraftField = keyof RegistrationDraft;
export type TextDraftField = Exclude<DraftField, "role">;
export type RegistrationFieldErrorCode = RegisterStep | "emailAlreadyRegistered";

export type RegistrationState = {
  stepIndex: number;
  language: OrganizerLanguage;
  draft: RegistrationDraft;
  status: "idle" | "submitting";
  fieldError: {
    field: RegisterStep;
    code: RegistrationFieldErrorCode;
  } | null;
  submissionError: "unavailable" | null;
};

export type RegistrationAction =
  | { type: "setTextValue"; field: TextDraftField; value: string }
  | { type: "setRole"; value: OrganizerRole }
  | { type: "setLanguage"; language: OrganizerLanguage }
  | { type: "next" }
  | { type: "back" }
  | {
      type: "fieldFailure";
      field: RegisterStep;
      code: RegistrationFieldErrorCode;
    }
  | { type: "submissionFailure" }
  | { type: "submitStart" }
  | { type: "submitEnd" };

export function createRegistrationState(
  language: OrganizerLanguage = "en",
): RegistrationState {
  return {
    stepIndex: 0,
    language,
    draft: {
      contactName: "",
      organizationName: "",
      role: null,
      email: "",
      password: "",
    },
    status: "idle",
    fieldError: null,
    submissionError: null,
  };
}

export function registrationReducer(
  state: RegistrationState,
  action: RegistrationAction,
): RegistrationState {
  if (action.type === "setTextValue") {
    return {
      ...state,
      draft: { ...state.draft, [action.field]: action.value },
      fieldError: null,
      submissionError: null,
    };
  }
  if (action.type === "setRole") {
    return {
      ...state,
      draft: { ...state.draft, role: action.value },
      fieldError: null,
      submissionError: null,
    };
  }
  if (action.type === "setLanguage") return { ...state, language: action.language };
  if (action.type === "next") {
    return {
      ...state,
      stepIndex: Math.min(state.stepIndex + 1, REGISTER_STEPS.length - 1),
      fieldError: null,
    };
  }
  if (action.type === "back") {
    return {
      ...state,
      stepIndex: Math.max(state.stepIndex - 1, 0),
      fieldError: null,
      submissionError: null,
    };
  }
  if (action.type === "fieldFailure") {
    return {
      ...state,
      stepIndex: REGISTER_STEPS.indexOf(action.field),
      status: "idle",
      fieldError: { field: action.field, code: action.code },
      submissionError: null,
    };
  }
  if (action.type === "submissionFailure") {
    return { ...state, status: "idle", submissionError: "unavailable" };
  }
  if (action.type === "submitStart") {
    return { ...state, status: "submitting", fieldError: null, submissionError: null };
  }
  return { ...state, status: "idle" };
}

export function draftFieldForStep(
  step: Exclude<RegisterStep, "role">,
): TextDraftField {
  if (step === "contact_name") return "contactName";
  if (step === "organization_name") return "organizationName";
  return step;
}
```

- [ ] **Step 9: Run contract, reducer, and type checks**

Run:

```bash
rtk bun test src/features/organizer-auth/schemas/organizerAuth.schema.test.ts src/features/organizer-auth/i18n/organizerAuth.messages.test.ts src/features/organizer-auth/model/registration.reducer.test.ts
rtk tsc
```

Expected: the focused feature tests and TypeScript pass. The architecture test remains red until later tasks create all asserted boundaries.

- [ ] **Step 10: Commit frontend contracts and state**

```bash
rtk git add tests/architecture.test.ts src/features/organizer-auth/types/organizerAuth.types.ts src/features/organizer-auth/schemas/organizerAuth.schema.ts src/features/organizer-auth/schemas/organizerAuth.schema.test.ts src/features/organizer-auth/i18n/organizerAuth.messages.ts src/features/organizer-auth/i18n/organizerAuth.messages.test.ts src/features/organizer-auth/model/registration.reducer.ts src/features/organizer-auth/model/registration.reducer.test.ts
rtk git commit -m "feat(organizer-auth): define contracts and registration state"
```

### Task 3: Build the Server Gateway and Session Cookie Boundary

**Repository:** `/Users/antoniopertuz/Documents/surnx/weft-web`

**Files:**
- Create: `src/features/organizer-auth/api/server/organizerAuth.gateway.ts`
- Create: `src/features/organizer-auth/api/server/organizerAuth.gateway.test.ts`
- Create: `src/features/organizer-auth/api/server/organizerSession.ts`
- Create: `src/features/organizer-auth/api/server/organizerSession.test.ts`

**Interfaces:**
- Consumes: `RegisterRequestDto`, `LoginRequestDto`, `OrganizerAuthField`; `WEFT_B2B_API_URL`; FastAPI responses from Task 1.
- Produces: `registerOrganizer(body, fetchImpl?)`, `loginOrganizer(body, fetchImpl?)`, `validateOrganizerSession(accessToken, fetchImpl?)`; `OrganizerAuthGatewayFailure`; `ORGANIZER_SESSION_COOKIE`; `setOrganizerSession(response, accessToken)`; `readOrganizerSession()`.

- [ ] **Step 1: Write exact gateway request and safe-failure tests**

Create `src/features/organizer-auth/api/server/organizerAuth.gateway.test.ts`. Use a captured `Request` to prove the token and body go only where intended:

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  loginOrganizer,
  registerOrganizer,
  validateOrganizerSession,
} from "./organizerAuth.gateway";

const registration = {
  contact_name: "Ana Restrepo",
  organization_name: "Weft Events",
  role: "event_manager" as const,
  email: "ana@example.com",
  password: "longenough",
  timezone: "America/Bogota",
  default_language: "es" as const,
};

let originalUrl: string | undefined;

beforeEach(() => {
  originalUrl = process.env.WEFT_B2B_API_URL;
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
});

test("register posts the exact DTO and parses the backend contract", async () => {
  let captured: Request | null = null;
  const outcome = await registerOrganizer(registration, async (input, init) => {
    captured = new Request(input, init);
    return Response.json({
      access_token: "register-secret",
      token_type: "bearer",
      organizer: {
        id: "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
        email: registration.email,
        contact_name: registration.contact_name,
        organization_name: registration.organization_name,
        role: registration.role,
        timezone: registration.timezone,
        default_language: registration.default_language,
        whatsapp: null,
      },
    }, { status: 201 });
  });
  expect(outcome).toEqual({ status: "ok", accessToken: "register-secret" });
  expect(captured?.url).toBe("https://b2b.example.test/v1/auth/register");
  expect(captured?.method).toBe("POST");
  expect(await captured?.json()).toEqual(registration);
});

test("login maps invalid credentials without returning upstream detail", async () => {
  const outcome = await loginOrganizer(
    { email: "ana@example.com", password: "wrong" },
    async () => Response.json(
      { detail: "invalid credentials", code: "domain_error" },
      { status: 401 },
    ),
  );
  expect(outcome).toEqual({ status: "invalidCredentials" });
  expect(JSON.stringify(outcome)).not.toContain("invalid credentials");
});

test("register maps duplicate email and recognized validation fields", async () => {
  const duplicate = await registerOrganizer(
    registration,
    async () => Response.json({ detail: "email already registered" }, { status: 409 }),
  );
  expect(duplicate).toEqual({ status: "emailAlreadyRegistered" });

  const invalid = await registerOrganizer(
    registration,
    async () => Response.json({
      detail: [{ loc: ["body", "role"], msg: "Input should be valid" }],
    }, { status: 422 }),
  );
  expect(invalid).toEqual({ status: "validation", field: "role" });
});

test("session validation distinguishes invalid from unavailable", async () => {
  const valid = await validateOrganizerSession(
    "session-secret",
    async (_input, init) => {
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer session-secret",
      );
      return Response.json([]);
    },
  );
  expect(valid).toEqual({ status: "valid" });

  const invalid = await validateOrganizerSession(
    "expired",
    async () => Response.json({}, { status: 401 }),
  );
  expect(invalid).toEqual({ status: "invalid" });

  const unavailable = await validateOrganizerSession(
    "session-secret",
    async () => {
      throw new Error("offline");
    },
  );
  expect(unavailable).toEqual({ status: "unavailable" });
});
```

- [ ] **Step 2: Write cookie-security tests**

Create `src/features/organizer-auth/api/server/organizerSession.test.ts`:

```ts
import { expect, test } from "bun:test";
import { NextResponse } from "next/server";
import {
  ORGANIZER_SESSION_COOKIE,
  setOrganizerSession,
} from "./organizerSession";

test("session cookie is HttpOnly, Lax, root-scoped, and seven days", () => {
  const response = NextResponse.json({ status: "authenticated" });
  setOrganizerSession(response, "jwt-secret", false);
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(ORGANIZER_SESSION_COOKIE).toBe("weft_organizer_session");
  expect(cookie).toContain("weft_organizer_session=jwt-secret");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=lax");
  expect(cookie).toContain("Path=/");
  expect(cookie).toContain("Max-Age=604800");
  expect(cookie).not.toContain("Secure");
});

test("production session cookie is Secure", () => {
  const response = NextResponse.json({ status: "authenticated" });
  setOrganizerSession(response, "jwt-secret", true);
  expect(response.headers.get("set-cookie") ?? "").toContain("Secure");
});
```

- [ ] **Step 3: Run gateway and cookie tests to confirm red**

Run:

```bash
rtk bun test src/features/organizer-auth/api/server/organizerAuth.gateway.test.ts src/features/organizer-auth/api/server/organizerSession.test.ts
```

Expected: both modules are missing.

- [ ] **Step 4: Implement the server gateway with bounded parsing**

Create `src/features/organizer-auth/api/server/organizerAuth.gateway.ts`. Keep the transport result separate from public browser error codes:

```ts
import { z } from "zod";
import { isOrganizerAuthField } from "../../schemas/organizerAuth.schema";
import { ORGANIZER_ROLES } from "../../types/organizerAuth.types";
import type {
  LoginRequestDto,
  OrganizerAuthField,
  RegisterRequestDto,
} from "../../types/organizerAuth.types";

const REQUEST_TIMEOUT_MS = 8_000;

export type OrganizerAuthGatewayFailure =
  | { status: "validation"; field?: OrganizerAuthField }
  | { status: "emailAlreadyRegistered" }
  | { status: "invalidCredentials" }
  | { status: "unavailable" };

export type OrganizerAuthGatewayOutcome =
  | { status: "ok"; accessToken: string }
  | OrganizerAuthGatewayFailure;

export type OrganizerSessionOutcome =
  | { status: "valid" }
  | { status: "invalid" }
  | { status: "unavailable" };

const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("bearer"),
});

const registerResponseSchema = tokenSchema.extend({
  organizer: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    contact_name: z.string(),
    organization_name: z.string(),
    role: z.enum(ORGANIZER_ROLES).nullable(),
    timezone: z.string(),
    default_language: z.string(),
    whatsapp: z.string().nullable(),
  }),
});

function backendBaseUrl(): string | null {
  return process.env.WEFT_B2B_API_URL?.replace(/\/$/, "") ?? null;
}

async function validationField(response: Response): Promise<OrganizerAuthField | undefined> {
  try {
    const body = await response.json() as { detail?: unknown };
    if (!Array.isArray(body.detail)) return undefined;
    for (const issue of body.detail) {
      const location = (issue as { loc?: unknown } | null)?.loc;
      const field = Array.isArray(location) ? location[1] : undefined;
      if (isOrganizerAuthField(field)) return field;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function authRequest(
  operation: "register" | "login",
  body: RegisterRequestDto | LoginRequestDto,
  fetchImpl: typeof fetch,
): Promise<OrganizerAuthGatewayOutcome> {
  const base = backendBaseUrl();
  if (!base) {
    console.error(`organizer auth ${operation} failed`, "configuration");
    return { status: "unavailable" };
  }

  let response: Response;
  try {
    response = await fetchImpl(`${base}/v1/auth/${operation}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    console.error(`organizer auth ${operation} failed`, "network");
    return { status: "unavailable" };
  }

  if (!response.ok) {
    console.error(`organizer auth ${operation} failed`, response.status);
    if (operation === "login" && response.status === 401) {
      return { status: "invalidCredentials" };
    }
    if (operation === "register" && response.status === 409) {
      return { status: "emailAlreadyRegistered" };
    }
    if (response.status === 422) {
      const field = await validationField(response);
      return field ? { status: "validation", field } : { status: "validation" };
    }
    return { status: "unavailable" };
  }

  try {
    const parsed = operation === "register"
      ? registerResponseSchema.parse(await response.json())
      : tokenSchema.parse(await response.json());
    return { status: "ok", accessToken: parsed.access_token };
  } catch {
    console.error(`organizer auth ${operation} failed`, "invalid-body");
    return { status: "unavailable" };
  }
}

export function registerOrganizer(
  body: RegisterRequestDto,
  fetchImpl: typeof fetch = fetch,
) {
  return authRequest("register", body, fetchImpl);
}

export function loginOrganizer(
  body: LoginRequestDto,
  fetchImpl: typeof fetch = fetch,
) {
  return authRequest("login", body, fetchImpl);
}

export async function validateOrganizerSession(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrganizerSessionOutcome> {
  const base = backendBaseUrl();
  if (!base) return { status: "unavailable" };
  try {
    const response = await fetchImpl(`${base}/v1/events`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status === 401 || response.status === 403) return { status: "invalid" };
    if (!response.ok) return { status: "unavailable" };
    return z.array(z.unknown()).safeParse(await response.json()).success
      ? { status: "valid" }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
```

- [ ] **Step 5: Implement cookie creation and request reading**

Create `src/features/organizer-auth/api/server/organizerSession.ts`:

```ts
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ORGANIZER_SESSION_COOKIE = "weft_organizer_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setOrganizerSession(
  response: NextResponse,
  accessToken: string,
  secure = process.env.NODE_ENV === "production",
): void {
  response.cookies.set(ORGANIZER_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function readOrganizerSession(): Promise<string | null> {
  return (await cookies()).get(ORGANIZER_SESSION_COOKIE)?.value ?? null;
}
```

- [ ] **Step 6: Run focused server-boundary tests and type checks**

Run:

```bash
rtk bun test src/features/organizer-auth/api/server/organizerAuth.gateway.test.ts src/features/organizer-auth/api/server/organizerSession.test.ts
rtk tsc
```

Expected: gateway and cookie tests pass; TypeScript reports no unsafe union or Next.js API use.

- [ ] **Step 7: Commit the server boundary**

```bash
rtk git add src/features/organizer-auth/api/server/organizerAuth.gateway.ts src/features/organizer-auth/api/server/organizerAuth.gateway.test.ts src/features/organizer-auth/api/server/organizerSession.ts src/features/organizer-auth/api/server/organizerSession.test.ts
rtk git commit -m "feat(organizer-auth): add secure backend gateway"
```

### Task 4: Add Browser Auth Route Handlers and Client

**Repository:** `/Users/antoniopertuz/Documents/surnx/weft-web`

**Files:**
- Create: `src/app/api/organizer-auth/_lib/response.ts`
- Create: `src/app/api/organizer-auth/register/route.ts`
- Create: `src/app/api/organizer-auth/register/route.test.ts`
- Create: `src/app/api/organizer-auth/login/route.ts`
- Create: `src/app/api/organizer-auth/login/route.test.ts`
- Create: `src/features/organizer-auth/api/client/organizerAuth.client.ts`
- Create: `src/features/organizer-auth/api/client/organizerAuth.client.test.ts`

**Interfaces:**
- Consumes: Task 2 request schemas and failure types; Task 3 gateway operations and `setOrganizerSession`.
- Produces: `POST /api/organizer-auth/register`, `POST /api/organizer-auth/login`, `OrganizerAuthClientError`, `OrganizerAuthClient`, `createOrganizerAuthClient(fetchImpl?, origin?)`, and singleton `organizerAuthClient`.

- [ ] **Step 1: Write registration Route Handler tests**

Create `src/app/api/organizer-auth/register/route.test.ts`:

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { POST } from "./route";

const validBody = {
  contact_name: "Ana Restrepo",
  organization_name: "Weft Events",
  role: "event_manager",
  email: "ana@example.com",
  password: "longenough",
  timezone: "America/Bogota",
  default_language: "es",
};

let originalFetch: typeof fetch;
let originalUrl: string | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalUrl = process.env.WEFT_B2B_API_URL;
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
});

function request(body: unknown, contentType = "application/json") {
  return new Request("http://localhost/api/organizer-auth/register", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: JSON.stringify(body),
  });
}

test("successful registration sets a secure server cookie and never returns the JWT", async () => {
  globalThis.fetch = (async () => Response.json({
    access_token: "backend-secret",
    token_type: "bearer",
    organizer: {
      id: "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
      email: validBody.email,
      contact_name: validBody.contact_name,
      organization_name: validBody.organization_name,
      role: validBody.role,
      timezone: validBody.timezone,
      default_language: validBody.default_language,
      whatsapp: null,
    },
  }, { status: 201 })) as typeof fetch;

  const response = await POST(request(validBody));
  const serialized = JSON.stringify(await response.json());
  expect(response.status).toBe(201);
  expect(serialized).toBe('{"status":"authenticated"}');
  expect(serialized).not.toContain("backend-secret");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("set-cookie") ?? "").toContain("HttpOnly");
});

test("invalid content type and body fail before FastAPI", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return Response.json({});
  }) as typeof fetch;
  expect((await POST(request(validBody, "text/plain"))).status).toBe(400);
  expect((await POST(request({ ...validBody, role: "boss" }))).status).toBe(400);
  expect(calls).toBe(0);
});

test("duplicate email maps to safe frontend-owned output", async () => {
  globalThis.fetch = (async () => Response.json(
    { detail: "email ana@example.com already registered" },
    { status: 409 },
  )) as typeof fetch;
  const response = await POST(request(validBody));
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: "emailAlreadyRegistered" });
});
```

- [ ] **Step 2: Write login Route Handler tests**

Create `src/app/api/organizer-auth/login/route.test.ts`:

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { POST } from "./route";

let originalFetch: typeof fetch;
let originalUrl: string | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalUrl = process.env.WEFT_B2B_API_URL;
  process.env.WEFT_B2B_API_URL = "https://b2b.example.test";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.WEFT_B2B_API_URL;
  else process.env.WEFT_B2B_API_URL = originalUrl;
});

function loginRequest(body: unknown) {
  return new Request("http://localhost/api/organizer-auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("login returns only authenticated status and sets HttpOnly session", async () => {
  globalThis.fetch = (async () => Response.json({
    access_token: "login-secret",
    token_type: "bearer",
  })) as typeof fetch;
  const response = await POST(loginRequest({
    email: "ana@example.com",
    password: "longenough",
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "authenticated" });
  expect(response.headers.get("set-cookie") ?? "").toContain("HttpOnly");
});

test("invalid credentials remain generic", async () => {
  globalThis.fetch = (async () => Response.json(
    { detail: "invalid credentials", code: "domain_error" },
    { status: 401 },
  )) as typeof fetch;
  const response = await POST(loginRequest({
    email: "ana@example.com",
    password: "wrong",
  }));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "invalidCredentials" });
});
```

- [ ] **Step 3: Write browser-client tests**

Create `src/features/organizer-auth/api/client/organizerAuth.client.test.ts`:

```ts
import { expect, test } from "bun:test";
import {
  createOrganizerAuthClient,
  OrganizerAuthClientError,
} from "./organizerAuth.client";

test("client posts registration to the same-origin BFF", async () => {
  let captured: Request | null = null;
  const client = createOrganizerAuthClient(async (input, init) => {
    captured = new Request(input, init);
    return Response.json({ status: "authenticated" }, { status: 201 });
  }, "http://localhost");
  const body = {
    contact_name: "Ana",
    organization_name: "Weft",
    role: "founder" as const,
    email: "ana@example.com",
    password: "longenough",
    timezone: "UTC",
    default_language: "en" as const,
  };
  await client.register(body);
  expect(captured?.url).toBe("http://localhost/api/organizer-auth/register");
  expect(captured?.method).toBe("POST");
  expect(await captured?.json()).toEqual(body);
});

test("client decodes only known failure codes", async () => {
  const client = createOrganizerAuthClient(async () => Response.json(
    { code: "emailAlreadyRegistered" },
    { status: 409 },
  ), "http://localhost");
  try {
    await client.register({
      contact_name: "Ana",
      organization_name: "Weft",
      role: "founder",
      email: "ana@example.com",
      password: "longenough",
      timezone: "UTC",
      default_language: "en",
    });
    throw new Error("expected auth client failure");
  } catch (error) {
    expect(error instanceof OrganizerAuthClientError).toBe(true);
    expect((error as OrganizerAuthClientError).data).toEqual({
      code: "emailAlreadyRegistered",
    });
  }
});

test("unknown and malformed failures collapse to unavailable", async () => {
  const client = createOrganizerAuthClient(async () => Response.json(
    { code: "internal-database-state" },
    { status: 500 },
  ), "http://localhost");
  try {
    await client.login({ email: "ana@example.com", password: "wrong" });
    throw new Error("expected auth client failure");
  } catch (error) {
    expect((error as OrganizerAuthClientError).data).toEqual({ code: "unavailable" });
  }
});
```

The injected client test uses an absolute `http://localhost` URL because Node's `Request` cannot resolve a browser-relative URL. Production client code still calls the relative same-origin path.

- [ ] **Step 4: Run the route and client tests to confirm red**

Run:

```bash
rtk bun test src/app/api/organizer-auth/register/route.test.ts src/app/api/organizer-auth/login/route.test.ts src/features/organizer-auth/api/client/organizerAuth.client.test.ts
```

Expected: Route Handler, response helper, and client modules are missing.

- [ ] **Step 5: Implement safe public responses**

Create `src/app/api/organizer-auth/_lib/response.ts`:

```ts
import type { OrganizerAuthGatewayFailure } from "@/features/organizer-auth/api/server/organizerAuth.gateway";

const STATUS_BY_FAILURE: Record<OrganizerAuthGatewayFailure["status"], number> = {
  validation: 400,
  emailAlreadyRegistered: 409,
  invalidCredentials: 401,
  unavailable: 503,
};

export function organizerAuthFailureResponse(
  outcome: OrganizerAuthGatewayFailure,
): Response {
  const body: { code: OrganizerAuthGatewayFailure["status"]; field?: string } = {
    code: outcome.status,
  };
  if (outcome.status === "validation" && outcome.field) body.field = outcome.field;
  return Response.json(body, {
    status: STATUS_BY_FAILURE[outcome.status],
    headers: { "Cache-Control": "no-store" },
  });
}

export function invalidOrganizerAuthRequest(): Response {
  return Response.json(
    { code: "validation" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
```

- [ ] **Step 6: Implement both validated Route Handlers**

Create `src/app/api/organizer-auth/register/route.ts`:

```ts
import { NextResponse } from "next/server";
import { registerOrganizer } from "@/features/organizer-auth/api/server/organizerAuth.gateway";
import { setOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { registrationRequestSchema } from "@/features/organizer-auth/schemas/organizerAuth.schema";
import {
  invalidOrganizerAuthRequest,
  organizerAuthFailureResponse,
} from "../_lib/response";

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return invalidOrganizerAuthRequest();
  }
  const parsed = registrationRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return invalidOrganizerAuthRequest();

  const outcome = await registerOrganizer(parsed.data);
  if (outcome.status !== "ok") return organizerAuthFailureResponse(outcome);

  const response = NextResponse.json(
    { status: "authenticated" },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
  setOrganizerSession(response, outcome.accessToken);
  return response;
}
```

Create `src/app/api/organizer-auth/login/route.ts` with the same boundary and the login-specific contract:

```ts
import { NextResponse } from "next/server";
import { loginOrganizer } from "@/features/organizer-auth/api/server/organizerAuth.gateway";
import { setOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { loginRequestSchema } from "@/features/organizer-auth/schemas/organizerAuth.schema";
import {
  invalidOrganizerAuthRequest,
  organizerAuthFailureResponse,
} from "../_lib/response";

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return invalidOrganizerAuthRequest();
  }
  const parsed = loginRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidOrganizerAuthRequest();

  const outcome = await loginOrganizer(parsed.data);
  if (outcome.status !== "ok") return organizerAuthFailureResponse(outcome);

  const response = NextResponse.json(
    { status: "authenticated" },
    { headers: { "Cache-Control": "no-store" } },
  );
  setOrganizerSession(response, outcome.accessToken);
  return response;
}
```

- [ ] **Step 7: Implement the injectable browser client**

Create `src/features/organizer-auth/api/client/organizerAuth.client.ts`:

```ts
import type {
  LoginRequestDto,
  OrganizerAuthFailureData,
  RegisterRequestDto,
} from "../../types/organizerAuth.types";
import { isOrganizerAuthField } from "../../schemas/organizerAuth.schema";

const REQUEST_TIMEOUT_MS = 8_000;
const KNOWN_CODES = new Set<OrganizerAuthFailureData["code"]>([
  "validation",
  "emailAlreadyRegistered",
  "invalidCredentials",
  "unavailable",
]);

function isKnownCode(
  value: unknown,
): value is OrganizerAuthFailureData["code"] {
  return typeof value === "string"
    && KNOWN_CODES.has(value as OrganizerAuthFailureData["code"]);
}

export class OrganizerAuthClientError extends Error {
  constructor(readonly data: OrganizerAuthFailureData) {
    super(data.code);
    this.name = "OrganizerAuthClientError";
  }
}

export type OrganizerAuthClient = {
  register(body: RegisterRequestDto): Promise<void>;
  login(body: LoginRequestDto): Promise<void>;
};

async function readFailure(response: Response): Promise<OrganizerAuthFailureData> {
  try {
    const body = await response.json() as { code?: unknown; field?: unknown };
    if (!isKnownCode(body.code)) {
      return { code: "unavailable" };
    }
    if (body.code === "validation") {
      return isOrganizerAuthField(body.field)
        ? { code: "validation", field: body.field }
        : { code: "validation" };
    }
    return { code: body.code };
  } catch {
    return { code: "unavailable" };
  }
}

export function createOrganizerAuthClient(
  fetchImpl: typeof fetch = fetch,
  origin = "",
): OrganizerAuthClient {
  async function post(path: string, body: RegisterRequestDto | LoginRequestDto) {
    let response: Response;
    try {
      response = await fetchImpl(`${origin}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new OrganizerAuthClientError({ code: "unavailable" });
    }
    if (!response.ok) throw new OrganizerAuthClientError(await readFailure(response));
    const parsed = await response.json().catch(() => null);
    if ((parsed as { status?: unknown } | null)?.status !== "authenticated") {
      throw new OrganizerAuthClientError({ code: "unavailable" });
    }
  }

  return {
    register: (body) => post("/api/organizer-auth/register", body),
    login: (body) => post("/api/organizer-auth/login", body),
  };
}

export const organizerAuthClient = createOrganizerAuthClient();
```

- [ ] **Step 8: Run all HTTP-boundary tests and type checks**

Run:

```bash
rtk bun test src/features/organizer-auth/api/server/organizerAuth.gateway.test.ts src/features/organizer-auth/api/server/organizerSession.test.ts src/app/api/organizer-auth/register/route.test.ts src/app/api/organizer-auth/login/route.test.ts src/features/organizer-auth/api/client/organizerAuth.client.test.ts
rtk tsc
```

Expected: all gateway, cookie, Route Handler, and client tests pass; TypeScript proves only recognized fields cross the browser boundary.

- [ ] **Step 9: Commit browser authentication boundaries**

```bash
rtk git add src/app/api/organizer-auth/_lib/response.ts src/app/api/organizer-auth/register/route.ts src/app/api/organizer-auth/register/route.test.ts src/app/api/organizer-auth/login/route.ts src/app/api/organizer-auth/login/route.test.ts src/features/organizer-auth/api/client/organizerAuth.client.ts src/features/organizer-auth/api/client/organizerAuth.client.test.ts
rtk git commit -m "feat(organizer-auth): add secure browser auth endpoints"
```

### Task 5: Create Branded Auth Shell and Animated Prompt Primitives

**Repository:** `/Users/antoniopertuz/Documents/surnx/weft-web`

**Files:**
- Create: `src/features/organizer-auth/components/OrganizerAuth.module.css`
- Create: `src/features/organizer-auth/components/AuthShell.tsx`
- Create: `src/features/organizer-auth/components/LanguageSelector.tsx`
- Create: `src/features/organizer-auth/components/AnimatedPrompt.tsx`
- Create: `src/features/organizer-auth/components/AnimatedPrompt.test.tsx`
- Create: `src/features/organizer-auth/components/AnimatedPrompt.mount.tsx`
- Create: `src/features/organizer-auth/components/AnimatedPrompt.interaction.test.ts`

**Interfaces:**
- Consumes: Task 2 language types/messages; existing `/icon.svg`, global color/font tokens, Motion 12.
- Produces: `AuthShell({ language, onLanguageChange, progress?, children })`, `LanguageSelector`, and `AnimatedPrompt({ text, className? })`.

- [ ] **Step 1: Write static prompt and language-selector tests**

Create `src/features/organizer-auth/components/AnimatedPrompt.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimatedPrompt } from "./AnimatedPrompt";
import { LanguageSelector } from "./LanguageSelector";

test("prompt renders one complete decorative string and addressable characters", () => {
  const html = renderToStaticMarkup(<AnimatedPrompt text="What's your role?" />);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('data-auth-character="true"');
  expect(html).toContain("What&#x27;s your role?");
});

test("language selector exposes a two-option radio group", () => {
  const html = renderToStaticMarkup(
    <LanguageSelector language="en" onChange={() => {}} />,
  );
  expect(html).toContain('role="radiogroup"');
  expect(html).toContain('aria-checked="true"');
  expect(html).toContain("English");
  expect(html).toContain("Español");
});
```

- [ ] **Step 2: Write isolated real-DOM motion tests**

Create `src/features/organizer-auth/components/AnimatedPrompt.mount.tsx` using the repository's existing JSDOM setup pattern. It must include these two tests:

```tsx
test("prompt characters receive progressive Motion markup", async () => {
  await withRoot(false, async (root, container) => {
    await act(async () => root.render(<AnimatedPrompt text="Welcome back." />));
    expect(container.querySelectorAll('[data-auth-character="true"]')).toHaveLength(12);
    expect(container.textContent).toContain("Welcome back.");
  });
});

test("reduced motion renders the complete prompt immediately", async () => {
  await withRoot(true, async (root, container) => {
    await act(async () => root.render(<AnimatedPrompt text="Create a password." />));
    expect(container.textContent).toContain("Create a password.");
    expect(container.querySelector('[data-reduced-motion="true"]')).toBeDefined();
  });
});
```

Implement `withRoot(reducedMotion, run)` by creating a fresh `JSDOM` per test, defining `window.matchMedia` so `matches` equals `reducedMotion`, assigning DOM constructors to `globalThis`, dynamically importing React `act` and `createRoot`, and unmounting in `finally`. This is the same isolation strategy used by `TypewriterMessage.mount.tsx`.

Create `src/features/organizer-auth/components/AnimatedPrompt.interaction.test.ts` as the subprocess launcher:

```ts
import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("animated organizer prompts pass in an isolated DOM", async () => {
  const projectRoot = fileURLToPath(new URL("../../../..", import.meta.url));
  const mountedSuite = fileURLToPath(
    new URL("./AnimatedPrompt.mount.tsx", import.meta.url),
  );
  const subprocess = Bun.spawn({
    cmd: [process.execPath, "test", mountedSuite],
    cwd: projectRoot,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ]);
  expect(exitCode, `${stdout}\n${stderr}`).toBe(0);
}, 20_000);
```

- [ ] **Step 3: Run primitive tests to confirm red**

Run:

```bash
rtk bun test src/features/organizer-auth/components/AnimatedPrompt.test.tsx src/features/organizer-auth/components/AnimatedPrompt.interaction.test.ts
```

Expected: the presentation modules do not exist.

- [ ] **Step 4: Implement the hero-derived prompt**

Create `src/features/organizer-auth/components/AnimatedPrompt.tsx`:

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment } from "react";
import styles from "./OrganizerAuth.module.css";

const ease = [0.23, 1, 0.32, 1] as const;

export function AnimatedPrompt({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const reduced = Boolean(useReducedMotion());
  let characterIndex = 0;
  const words = text.split(/\s+/).map((word) => ({
    word,
    characters: Array.from(word).map((character) => ({
      character,
      index: characterIndex++,
    })),
  }));
  const characterCount = Math.max(characterIndex, 1);
  const stagger = Math.min(0.035, 0.9 / characterCount);

  return (
    <span
      aria-hidden="true"
      className={`${styles.prompt} ${className}`.trim()}
      data-reduced-motion={reduced ? "true" : "false"}
    >
      {words.map(({ word, characters }, wordIndex) => (
        <Fragment key={`${word}-${wordIndex}`}>
          <span className={styles.promptWord}>
            {characters.map(({ character, index }) => (
              <motion.span
                animate={{
                  clipPath: "inset(0 0% 0 0)",
                  opacity: 1,
                  transform: "translate3d(0, 0, 0)",
                }}
                className={styles.promptCharacter}
                data-auth-character="true"
                initial={reduced ? false : {
                  clipPath: "inset(0 100% 0 0)",
                  opacity: 0,
                  transform: "translate3d(0, 0.16em, 0)",
                }}
                key={`${character}-${index}`}
                transition={{
                  delay: reduced ? 0 : 0.08 + index * stagger,
                  duration: reduced ? 0 : 0.16,
                  ease,
                }}
              >
                {character}
              </motion.span>
            ))}
          </span>
          {wordIndex < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}
```

The complete accessible prompt is supplied by the surrounding `<label>`, `<legend>`, or heading in later tasks. `AnimatedPrompt` itself remains decorative so assistive technology never hears character updates.

- [ ] **Step 5: Implement language selector and auth shell**

Create `LanguageSelector.tsx`:

```tsx
"use client";

import { organizerAuthMessages } from "../i18n/organizerAuth.messages";
import { useRef, type KeyboardEvent } from "react";
import type { OrganizerLanguage } from "../types/organizerAuth.types";
import styles from "./OrganizerAuth.module.css";

const LANGUAGES = ["en", "es"] as const;

export function LanguageSelector({
  language,
  onChange,
}: {
  language: OrganizerLanguage;
  onChange: (language: OrganizerLanguage) => void;
}) {
  const messages = organizerAuthMessages[language];
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = (index + direction + LANGUAGES.length) % LANGUAGES.length;
    onChange(LANGUAGES[nextIndex]);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      aria-label={messages.languageLabel}
      className={styles.languageSelector}
      role="radiogroup"
    >
      {LANGUAGES.map((option, index) => (
        <button
          aria-checked={language === option}
          key={option}
          onClick={() => onChange(option)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          ref={(element) => { optionRefs.current[index] = element; }}
          role="radio"
          tabIndex={language === option ? 0 : -1}
          type="button"
        >
          {option === "en" ? messages.english : messages.spanish}
        </button>
      ))}
    </div>
  );
}
```

Create `AuthShell.tsx`:

```tsx
"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { OrganizerLanguage } from "../types/organizerAuth.types";
import { LanguageSelector } from "./LanguageSelector";
import styles from "./OrganizerAuth.module.css";

export function AuthShell({
  children,
  language,
  onLanguageChange,
  progress,
}: {
  children: ReactNode;
  language: OrganizerLanguage;
  onLanguageChange: (language: OrganizerLanguage) => void;
  progress?: { current: number; total: number; label: string };
}) {
  return (
    <main className={styles.shell} lang={language}>
      <div aria-hidden="true" className={styles.ambientEmber} />
      <div aria-hidden="true" className={styles.ambientSignal} />
      <header className={styles.header}>
        <a aria-label="Weft home" className={styles.brand} href="/">
          <Image alt="" aria-hidden height={38} src="/icon.svg" width={38} />
          <span>weft</span>
        </a>
        <LanguageSelector language={language} onChange={onLanguageChange} />
      </header>
      {progress ? (
        <div className={styles.progressWrap}>
          <div
            aria-label={progress.label}
            aria-valuemax={progress.total}
            aria-valuemin={1}
            aria-valuenow={progress.current}
            className={styles.progressTrack}
            role="progressbar"
          >
            <span style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
          <span aria-hidden="true" className={styles.progressCount}>
            {progress.current}/{progress.total}
          </span>
        </div>
      ) : null}
      <div className={styles.stage}>{children}</div>
    </main>
  );
}
```

- [ ] **Step 6: Establish feature-owned visual tokens and responsive shell**

Create `OrganizerAuth.module.css` with these named classes and calibrated values. Later tasks may add role, field, and action selectors to this same module:

```css
.shell {
  position: relative;
  isolation: isolate;
  display: grid;
  min-height: 100svh;
  overflow-x: hidden;
  overflow-y: auto;
  grid-template-rows: auto auto 1fr;
  background:
    radial-gradient(circle at 10% 18%, rgb(244 81 30 / 6%), transparent 28rem),
    radial-gradient(circle at 90% 78%, rgb(0 144 222 / 4%), transparent 30rem),
    var(--color-bone);
  color: var(--color-ink);
}

.shell::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image:
    radial-gradient(circle at 25% 30%, rgb(18 18 18 / 1.2%) 0 0.55px, transparent 0.7px),
    radial-gradient(circle at 70% 65%, rgb(244 81 30 / 1.8%) 0 0.5px, transparent 0.7px);
  background-position: 0 0, 7px 9px;
  background-size: 13px 13px, 17px 17px;
  content: "";
  opacity: 0.3;
  pointer-events: none;
}

.ambientEmber,
.ambientSignal {
  position: absolute;
  z-index: -1;
  width: 22rem;
  height: 22rem;
  border-radius: 999px;
  filter: blur(90px);
  pointer-events: none;
}

.ambientEmber { top: 8%; left: -10rem; background: rgb(244 81 30 / 7%); }
.ambientSignal { right: -10rem; bottom: 6%; background: rgb(0 144 222 / 5%); }

.header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: max(1rem, env(safe-area-inset-top)) clamp(1rem, 4vw, 2.5rem) 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.8rem;
  color: var(--color-ink);
  font-size: 1.35rem;
  font-weight: 700;
}

.languageSelector {
  display: inline-flex;
  gap: 0.2rem;
  border: 1px solid rgb(18 18 18 / 10%);
  border-radius: 999px;
  background: rgb(255 255 255 / 58%);
  padding: 0.22rem;
  backdrop-filter: blur(12px);
}

.languageSelector button {
  min-height: 2.25rem;
  border-radius: 999px;
  padding: 0.45rem 0.78rem;
  color: rgb(18 18 18 / 58%);
  font-family: var(--font-mono);
  font-size: 0.68rem;
}

.languageSelector button[aria-checked="true"] {
  background: var(--color-ink);
  color: var(--color-paper);
}

.brand:focus-visible,
.languageSelector button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-signal) 70%, white);
  outline-offset: 3px;
}

.progressWrap {
  display: grid;
  width: min(38rem, calc(100% - 2rem));
  margin: clamp(1rem, 3vh, 1.75rem) auto 0;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.85rem;
}

.progressTrack {
  height: 0.22rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(18 18 18 / 10%);
}

.progressTrack span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-ember);
  transition: width 360ms var(--ease-out-ui);
}

.progressCount {
  color: rgb(18 18 18 / 48%);
  font-family: var(--font-mono);
  font-size: 0.68rem;
}

.stage {
  display: grid;
  min-height: 0;
  place-items: center;
  padding: clamp(1.5rem, 5vh, 4rem) 1rem max(1.5rem, env(safe-area-inset-bottom));
}

.prompt {
  display: block;
  max-width: min(24ch, calc(100vw - 2rem));
  margin: 0 auto;
  font-family: var(--font-display);
  font-size: clamp(2rem, 5.5vw, 4.7rem);
  font-weight: 600;
  letter-spacing: -0.055em;
  line-height: 1.04;
  text-align: center;
  text-wrap: balance;
}

.promptWord { display: inline-block; white-space: nowrap; }
.promptCharacter { display: inline-block; will-change: clip-path, opacity, transform; }

@supports (height: 100dvh) {
  .shell { min-height: 100dvh; }
}

@media (max-width: 520px) {
  .header { align-items: flex-start; }
  .brand span { display: none; }
  .prompt { font-size: clamp(2rem, 10vw, 3.1rem); }
}

@media (max-height: 680px) {
  .stage { align-items: start; padding-top: 1rem; padding-bottom: 1rem; }
  .prompt { font-size: clamp(1.8rem, 7vh, 3rem); }
}

@media (prefers-reduced-motion: reduce) {
  .shell,
  .shell * {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Run primitive tests, type checks, and lint**

Run:

```bash
rtk bun test src/features/organizer-auth/components/AnimatedPrompt.test.tsx src/features/organizer-auth/components/AnimatedPrompt.interaction.test.ts
rtk tsc
rtk lint
```

Expected: static and real-DOM prompt tests pass, and the shared presentation compiles cleanly.

- [ ] **Step 8: Commit presentation primitives**

```bash
rtk git add src/features/organizer-auth/components/OrganizerAuth.module.css src/features/organizer-auth/components/AuthShell.tsx src/features/organizer-auth/components/LanguageSelector.tsx src/features/organizer-auth/components/AnimatedPrompt.tsx src/features/organizer-auth/components/AnimatedPrompt.test.tsx src/features/organizer-auth/components/AnimatedPrompt.mount.tsx src/features/organizer-auth/components/AnimatedPrompt.interaction.test.ts
rtk git commit -m "feat(organizer-auth): add branded auth shell and prompt motion"
```

### Task 6: Implement the Five-Screen Registration Flow

**Repository:** `/Users/antoniopertuz/Documents/surnx/weft-web`

**Files:**
- Create: `src/features/organizer-auth/components/RoleOptions.tsx`
- Create: `src/features/organizer-auth/components/RegistrationQuestion.tsx`
- Create: `src/features/organizer-auth/components/RegisterFlow.tsx`
- Create: `src/features/organizer-auth/components/RegisterFlow.mount.tsx`
- Create: `src/features/organizer-auth/components/RegisterFlow.interaction.test.ts`
- Modify: `src/features/organizer-auth/components/OrganizerAuth.module.css`

**Interfaces:**
- Consumes: Task 2 reducer, validation, DTO mapping, messages, step and role types; Task 4 `OrganizerAuthClient`; Task 5 shell and prompt.
- Produces: `RoleOptions`, `RegistrationQuestion`, and `RegisterFlow({ client?, initialLanguage?, onAuthenticated? })`.

- [ ] **Step 1: Write an isolated registration interaction suite**

Create `src/features/organizer-auth/components/RegisterFlow.mount.tsx` with a fresh JSDOM harness, the same global constructor setup used by the existing questionnaire mount suites, and a fake client:

```tsx
const registrations: RegisterRequestDto[] = [];
const client: OrganizerAuthClient = {
  login: async () => {},
  register: async (body) => {
    registrations.push(body);
  },
};
```

Define deterministic DOM helpers inside the mount suite:

```tsx
function buttonNamed(container: HTMLElement, name: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

async function enter(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement>("input:not([type=hidden])");
  if (!input) throw new Error("Active input not found");
  await act(async () => setInput(input, value));
  await act(async () => {
    input.dispatchEvent(new window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    }));
  });
}
```

Add these complete behavior tests:

```tsx
test("registration renders exactly one question and follows the approved order", async () => {
  await withFlow(client, async (container) => {
    expect(container.textContent).toContain("What should we call you?");
    expect(container.querySelectorAll("[data-registration-question]")).toHaveLength(1);
    await enter(container, "Ana Restrepo");
    expect(container.textContent).toContain("What organization are you hosting with?");
    await enter(container, "Weft Events");
    expect(container.textContent).toContain("What's your role?");
    await act(async () => buttonNamed(container, "Event Manager").click());
    await act(async () => buttonNamed(container, "Continue").click());
    expect(container.textContent).toContain("What's your work email?");
    await enter(container, "ana@example.com");
    expect(container.textContent).toContain("Create a password.");
  });
});

test("language changes copy without clearing answers", async () => {
  await withFlow(client, async (container) => {
    await enter(container, "Ana Restrepo");
    await act(async () => buttonNamed(container, "Español").click());
    expect(container.textContent).toContain("¿Con qué organización haces tus eventos?");
    await act(async () => buttonNamed(container, "Atrás").click());
    const input = container.querySelector<HTMLInputElement>("input");
    expect(input?.value).toBe("Ana Restrepo");
  });
});

test("completed registration sends language, canonical role, timezone, and no WhatsApp", async () => {
  registrations.length = 0;
  await withFlow(client, async (container) => {
    await enter(container, "Ana Restrepo");
    await enter(container, "Weft Events");
    await act(async () => buttonNamed(container, "Founder").click());
    await act(async () => buttonNamed(container, "Continue").click());
    await enter(container, "ana@example.com");
    await enter(container, "longenough");
    await waitFor(() => registrations.length === 1);
    expect(registrations[0]).toEqual({
      contact_name: "Ana Restrepo",
      organization_name: "Weft Events",
      role: "founder",
      email: "ana@example.com",
      password: "longenough",
      timezone: "America/Bogota",
      default_language: "en",
    });
    expect("whatsapp" in registrations[0]).toBe(false);
  }, { timezone: () => "America/Bogota" });
});

test("duplicate email returns to email with a login link", async () => {
  const duplicateClient: OrganizerAuthClient = {
    login: async () => {},
    register: async () => {
      throw new OrganizerAuthClientError({ code: "emailAlreadyRegistered" });
    },
  };
  await withCompletedFlow(duplicateClient, async (container) => {
    await waitFor(() => container.textContent?.includes("already exists") === true);
    expect(container.textContent).toContain("What's your work email?");
    expect(container.querySelector('a[href="/organizer/login"]')).toBeDefined();
  });
});

test("Other is a terminal role value and reveals no text field", async () => {
  await withFlow(client, async (container) => {
    await enter(container, "Ana");
    await enter(container, "Weft");
    await act(async () => buttonNamed(container, "Other").click());
    expect(container.querySelectorAll("input")).toHaveLength(0);
    expect(container.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toContain("Other");
  });
});

test("role uses roving radio focus and does not auto-advance", async () => {
  await withFlow(client, async (container) => {
    await enter(container, "Ana");
    await enter(container, "Weft");
    const founder = buttonNamed(container, "Founder");
    founder.focus();
    await act(async () => {
      founder.dispatchEvent(new window.KeyboardEvent(
        "keydown",
        { bubbles: true, cancelable: true, key: "ArrowRight" },
      ));
    });
    const community = buttonNamed(container, "Community Manager");
    expect(community.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(community);
    expect(container.textContent).toContain("What's your role?");
  });
});

test("focus follows every question, including the role group", async () => {
  await withFlow(client, async (container) => {
    await waitFor(() => document.activeElement?.getAttribute("type") === "text");
    await enter(container, "Ana");
    await enter(container, "Weft");
    await waitFor(() => document.activeElement?.getAttribute("role") === "radio");
    expect(document.activeElement?.textContent).toContain("Founder");
  });
});
```

Implement `withFlow` and `withCompletedFlow` in the same file. `withFlow` renders `RegisterFlow` with `onAuthenticated={() => {}}`, `readTimezone` injection, and reduced motion enabled so assertions do not wait on decorative timing. `withCompletedFlow` enters the four preceding values, submits the password, and then invokes its assertion callback.

Create `RegisterFlow.interaction.test.ts` with the same subprocess launcher shape as Task 5 and a 30-second timeout.

- [ ] **Step 2: Run the registration suite to confirm red**

Run:

```bash
rtk bun test src/features/organizer-auth/components/RegisterFlow.interaction.test.ts
```

Expected: `RegisterFlow`, `RegistrationQuestion`, and `RoleOptions` are missing.

- [ ] **Step 3: Implement the semantic role group**

Create `RoleOptions.tsx`:

```tsx
"use client";

import { useRef, type KeyboardEvent } from "react";
import type { OrganizerAuthMessages } from "../i18n/organizerAuth.messages";
import { ORGANIZER_ROLES, type OrganizerRole } from "../types/organizerAuth.types";
import styles from "./OrganizerAuth.module.css";

type RoleLabels = OrganizerAuthMessages["roles"];

export function RoleOptions({
  labels,
  selected,
  onChange,
}: {
  labels: RoleLabels;
  selected: OrganizerRole | null;
  onChange: (role: OrganizerRole) => void;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const keyOffsets: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    let nextIndex = index;
    if (event.key in keyOffsets) {
      nextIndex = (index + keyOffsets[event.key] + ORGANIZER_ROLES.length)
        % ORGANIZER_ROLES.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = ORGANIZER_ROLES.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onChange(ORGANIZER_ROLES[nextIndex]);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.roleGrid} role="radiogroup">
      {ORGANIZER_ROLES.map((role, index) => (
        <button
          aria-checked={selected === role}
          className={styles.roleOption}
          data-auth-autofocus={
            selected === role || (selected === null && index === 0)
              ? "true"
              : undefined
          }
          key={role}
          onClick={() => onChange(role)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          ref={(element) => { optionRefs.current[index] = element; }}
          role="radio"
          tabIndex={selected === role || (selected === null && index === 0) ? 0 : -1}
          type="button"
        >
          {labels[role]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement the active question component**

Create `RegistrationQuestion.tsx` with one semantic field per step:

```tsx
"use client";

import type { OrganizerAuthMessages } from "../i18n/organizerAuth.messages";
import { draftFieldForStep, type RegistrationState } from "../model/registration.reducer";
import type { OrganizerRole, RegisterStep } from "../types/organizerAuth.types";
import { AnimatedPrompt } from "./AnimatedPrompt";
import { RoleOptions } from "./RoleOptions";
import styles from "./OrganizerAuth.module.css";

type RegistrationQuestionProps = {
  step: RegisterStep;
  state: RegistrationState;
  messages: OrganizerAuthMessages;
  disabled: boolean;
  onTextChange: (value: string) => void;
  onRoleChange: (role: OrganizerRole) => void;
  onEnter: () => void;
};

export function RegistrationQuestion({
  step,
  state,
  messages,
  disabled,
  onTextChange,
  onRoleChange,
  onEnter,
}: RegistrationQuestionProps) {
    const prompt = messages.registration.prompts[step];
    const error = state.fieldError?.field === step
      ? messages.errors[state.fieldError.code]
      : null;

    if (step === "role") {
      return (
        <fieldset className={styles.question} data-registration-question>
          <legend className={styles.questionPrompt}>
            <span className="sr-only">{prompt}</span>
            <AnimatedPrompt text={prompt} />
          </legend>
          <RoleOptions
            labels={messages.roles}
            onChange={onRoleChange}
            selected={state.draft.role}
          />
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </fieldset>
      );
    }

    const draftField = draftFieldForStep(step);
    const value = state.draft[draftField];
    const type = step === "email" ? "email" : step === "password" ? "password" : "text";
    const autoComplete = step === "contact_name"
      ? "name"
      : step === "organization_name"
        ? "organization"
        : step === "email"
          ? "username"
          : "new-password";

    return (
      <div className={styles.question} data-registration-question>
        <label className={styles.questionPrompt} htmlFor={`organizer-${step}`}>
          <span className="sr-only">{prompt}</span>
          <AnimatedPrompt text={prompt} />
        </label>
        <input
          aria-describedby={error ? `organizer-${step}-error` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className={styles.field}
          data-auth-autofocus="true"
          disabled={disabled}
          id={`organizer-${step}`}
          maxLength={step === "password" ? undefined : step === "email" ? 320 : 200}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onEnter();
            }
          }}
          placeholder={messages.registration.placeholders[step]}
          type={type}
          value={typeof value === "string" ? value : ""}
        />
        {error ? (
          <p className={styles.error} id={`organizer-${step}-error`} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
}
```

- [ ] **Step 5: Implement registration orchestration and failure recovery**

Create `RegisterFlow.tsx`. The control flow must use the reducer and must not keep a second copy of registration answers:

```tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useReducer, useRef } from "react";
import {
  organizerAuthClient,
  OrganizerAuthClientError,
  type OrganizerAuthClient,
} from "../api/client/organizerAuth.client";
import { organizerAuthMessages } from "../i18n/organizerAuth.messages";
import {
  createRegistrationState,
  draftFieldForStep,
  registrationReducer,
} from "../model/registration.reducer";
import {
  resolveBrowserTimezone,
  toRegisterRequest,
  validateRegistrationStep,
} from "../schemas/organizerAuth.schema";
import {
  REGISTER_STEPS,
  type OrganizerLanguage,
  type OrganizerRole,
  type RegisterStep,
} from "../types/organizerAuth.types";
import { AuthShell } from "./AuthShell";
import { RegistrationQuestion } from "./RegistrationQuestion";
import styles from "./OrganizerAuth.module.css";

function isRegisterStep(value: unknown): value is RegisterStep {
  return typeof value === "string"
    && REGISTER_STEPS.some((step) => step === value);
}

export function RegisterFlow({
  client = organizerAuthClient,
  initialLanguage = "en",
  onAuthenticated = () => window.location.replace("/organizer"),
  readTimezone,
}: {
  client?: OrganizerAuthClient;
  initialLanguage?: OrganizerLanguage;
  onAuthenticated?: () => void;
  readTimezone?: () => string;
}) {
  const [state, dispatch] = useReducer(
    registrationReducer,
    initialLanguage,
    createRegistrationState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);
  const reduced = Boolean(useReducedMotion());
  const step = REGISTER_STEPS[state.stepIndex];
  const messages = organizerAuthMessages[state.language];

  useEffect(() => {
    const timer = setTimeout(() => {
      formRef.current
        ?.querySelector<HTMLElement>('[data-auth-autofocus="true"]')
        ?.focus();
    }, reduced ? 0 : 180);
    return () => clearTimeout(timer);
  }, [reduced, state.fieldError, step]);

  function failCurrent() {
    dispatch({ type: "fieldFailure", field: step, code: step });
  }

  async function advance() {
    if (state.status === "submitting" || inFlight.current) return;
    if (validateRegistrationStep(step, state.draft)) {
      failCurrent();
      return;
    }
    if (step !== "password") {
      dispatch({ type: "next" });
      return;
    }

    inFlight.current = true;
    dispatch({ type: "submitStart" });
    try {
      await client.register(toRegisterRequest(
        state.draft,
        state.language,
        resolveBrowserTimezone(readTimezone),
      ));
      onAuthenticated();
    } catch (error) {
      if (error instanceof OrganizerAuthClientError) {
        if (error.data.code === "emailAlreadyRegistered") {
          dispatch({
            type: "fieldFailure",
            field: "email",
            code: "emailAlreadyRegistered",
          });
        } else if (
          error.data.code === "validation"
          && isRegisterStep(error.data.field)
        ) {
          const field = error.data.field;
          dispatch({ type: "fieldFailure", field, code: field });
        } else {
          dispatch({ type: "submissionFailure" });
        }
      } else {
        dispatch({ type: "submissionFailure" });
      }
    } finally {
      inFlight.current = false;
      dispatch({ type: "submitEnd" });
    }
  }

  const progressLabel = messages.registration.progress
    .replace("{current}", String(state.stepIndex + 1))
    .replace("{total}", String(REGISTER_STEPS.length));

  return (
    <AuthShell
      language={state.language}
      onLanguageChange={(language) => dispatch({ type: "setLanguage", language })}
      progress={{ current: state.stepIndex + 1, total: REGISTER_STEPS.length, label: progressLabel }}
    >
      <motion.form
        className={styles.form}
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void advance();
        }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
            exit={{ opacity: 0, transform: "translate3d(0, -12px, 0)" }}
            initial={reduced ? false : { opacity: 0, transform: "translate3d(0, 14px, 0)" }}
            key={step}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }}
          >
            <RegistrationQuestion
              disabled={state.status === "submitting"}
              messages={messages}
              onEnter={() => void advance()}
              onRoleChange={(role: OrganizerRole) => dispatch({ type: "setRole", value: role })}
              onTextChange={(value) => {
                if (step !== "role") {
                  dispatch({
                    type: "setTextValue",
                    field: draftFieldForStep(step),
                    value,
                  });
                }
              }}
              state={state}
              step={step}
            />
          </motion.div>
        </AnimatePresence>
        {state.submissionError ? (
          <p className={styles.error} role="alert">
            {messages.errors[state.submissionError]}
          </p>
        ) : null}
        {state.fieldError?.code === "emailAlreadyRegistered" ? (
          <a className={styles.inlineLink} href="/organizer/login">{messages.registration.loginLink}</a>
        ) : null}
        <div className={styles.actions}>
          {state.stepIndex > 0 ? (
            <button
              className={styles.back}
              disabled={state.status === "submitting"}
              onClick={() => dispatch({ type: "back" })}
              type="button"
            >
              {messages.registration.back}
            </button>
          ) : (
            <span>{messages.registration.accountPrompt} <a href="/organizer/login">{messages.registration.loginLink}</a></span>
          )}
          <button className={styles.primary} disabled={state.status === "submitting"} type="submit">
            {state.status === "submitting"
              ? messages.registration.submitting
              : step === "password"
                ? messages.registration.submit
                : messages.registration.continue}
          </button>
        </div>
      </motion.form>
    </AuthShell>
  );
}
```

`isRegisterStep` deliberately excludes `timezone` and `default_language`; failures for those silent fields become the retryable submission error because neither is a visible question.

- [ ] **Step 6: Add focused role, field, action, and mobile CSS**

Append these selectors to `OrganizerAuth.module.css`:

```css
.form {
  display: grid;
  width: min(58rem, 100%);
  justify-items: center;
  gap: 1.25rem;
}

.question {
  display: grid;
  width: 100%;
  justify-items: center;
  gap: clamp(1.4rem, 4vh, 2.5rem);
  border: 0;
  padding: 0;
  text-align: center;
}

.questionPrompt { display: block; width: 100%; }

.field {
  width: min(34rem, 100%);
  min-height: 4.25rem;
  border: 0;
  border-bottom: 2px solid rgb(18 18 18 / 16%);
  border-radius: 0;
  background: transparent;
  padding: 0.75rem 0.25rem;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: clamp(1.15rem, 2vw, 1.45rem);
  text-align: center;
  outline: none;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.field::placeholder { color: rgb(18 18 18 / 34%); }
.field:focus { border-color: var(--color-signal); box-shadow: 0 2px 0 rgb(0 144 222 / 16%); }
.field[aria-invalid="true"] { border-color: var(--color-ember); }

.roleGrid {
  display: grid;
  width: min(44rem, 100%);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.roleOption {
  min-height: 4.5rem;
  border: 1px solid rgb(18 18 18 / 11%);
  border-radius: 1.15rem;
  background: rgb(255 255 255 / 64%);
  padding: 0.9rem 1rem;
  color: var(--color-ink);
  font-weight: 600;
  transition: transform 150ms var(--ease-out-ui), border-color 180ms ease, background 180ms ease;
}

.roleOption[aria-checked="true"] {
  border-color: var(--color-ember);
  background: color-mix(in srgb, var(--color-ember) 9%, white);
}

.roleOption:active { transform: scale(0.98); }
.roleOption:focus-visible,
.primary:focus-visible,
.back:focus-visible,
.inlineLink:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-signal) 70%, white);
  outline-offset: 3px;
}

.actions {
  display: flex;
  min-height: 3.4rem;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgb(18 18 18 / 55%);
  font-size: 0.86rem;
}

.actions a,
.inlineLink { color: var(--color-ink); text-decoration: underline; text-underline-offset: 0.25rem; }

.primary {
  min-height: 3.35rem;
  border-radius: 999px;
  background: var(--color-ember);
  padding: 0.85rem 1.7rem;
  color: var(--color-paper);
  font-weight: 700;
  box-shadow: var(--shadow-premium);
}

.primary:active { transform: scale(0.98); }
.primary:disabled,
.back:disabled { opacity: 0.5; }
.back { min-height: 3rem; border-radius: 999px; padding: 0.7rem 1rem; color: rgb(18 18 18 / 58%); }

.error {
  max-width: 32rem;
  margin: 0;
  color: #c84419;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.5;
  text-align: center;
}

@media (hover: hover) and (pointer: fine) {
  .roleOption:hover { transform: translate3d(0, -2px, 0); }
}

@media (max-width: 680px) {
  .roleGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .actions { flex-wrap: wrap; }
}

@media (max-width: 380px) {
  .roleGrid { grid-template-columns: 1fr; gap: 0.5rem; }
  .roleOption { min-height: 3.7rem; }
}
```

- [ ] **Step 7: Run registration, contract, and presentation regression tests**

Run:

```bash
rtk bun test src/features/organizer-auth/components/RegisterFlow.interaction.test.ts src/features/organizer-auth/components/AnimatedPrompt.test.tsx src/features/organizer-auth/components/AnimatedPrompt.interaction.test.ts src/features/organizer-auth/model/registration.reducer.test.ts src/features/organizer-auth/schemas/organizerAuth.schema.test.ts
rtk tsc
rtk lint
```

Expected: all five screens, language preservation, canonical role, exact DTO, duplicate recovery, motion, types, and lint pass.

- [ ] **Step 8: Commit registration UI**

```bash
rtk git add src/features/organizer-auth/components/RoleOptions.tsx src/features/organizer-auth/components/RegistrationQuestion.tsx src/features/organizer-auth/components/RegisterFlow.tsx src/features/organizer-auth/components/RegisterFlow.mount.tsx src/features/organizer-auth/components/RegisterFlow.interaction.test.ts src/features/organizer-auth/components/OrganizerAuth.module.css src/features/organizer-auth/i18n/organizerAuth.messages.ts
rtk git commit -m "feat(organizer-auth): add organizer registration flow"
```

### Task 7: Implement Single-Screen Login and Auth Pages

**Repository:** `/Users/antoniopertuz/Documents/surnx/weft-web`

**Files:**
- Create: `src/features/organizer-auth/components/LoginForm.tsx`
- Create: `src/features/organizer-auth/components/LoginForm.mount.tsx`
- Create: `src/features/organizer-auth/components/LoginForm.interaction.test.ts`
- Create: `src/app/organizer/register/page.tsx`
- Create: `src/app/organizer/register/page.test.tsx`
- Create: `src/app/organizer/login/page.tsx`
- Create: `src/app/organizer/login/page.test.tsx`
- Modify: `src/features/organizer-auth/components/OrganizerAuth.module.css`

**Interfaces:**
- Consumes: Task 2 localized messages and login schema; Task 4 browser client; Task 5 shell and prompt; Task 6 `RegisterFlow`.
- Produces: `LoginForm({ client?, initialLanguage?, onAuthenticated? })`, public UI pages `/organizer/register` and `/organizer/login`, private `robots` metadata.

- [ ] **Step 1: Write isolated login interaction tests**

Create `LoginForm.mount.tsx` using the same fresh-JSDOM harness as Task 6. Add these tests:

```tsx
test("login keeps email and password together with password-manager autocomplete", async () => {
  await withLogin(async () => {}, async (container) => {
    const email = container.querySelector<HTMLInputElement>('input[type="email"]');
    const password = container.querySelector<HTMLInputElement>('input[type="password"]');
    expect(email).toBeDefined();
    expect(password).toBeDefined();
    expect(email?.getAttribute("autocomplete")).toBe("username");
    expect(password?.getAttribute("autocomplete")).toBe("current-password");
    expect(container.textContent).toContain("Welcome back.");
  });
});

test("valid login submits once and reports authentication", async () => {
  const submitted: LoginRequestDto[] = [];
  let authenticated = 0;
  await withLogin(
    async (body) => { submitted.push(body); },
    async (container) => {
      await act(async () => setInput(
        container.querySelector<HTMLInputElement>('input[type="email"]')!,
        "ana@example.com",
      ));
      await act(async () => setInput(
        container.querySelector<HTMLInputElement>('input[type="password"]')!,
        "longenough",
      ));
      await act(async () => buttonNamed(container, "Sign in").click());
      await waitFor(() => authenticated === 1);
      expect(submitted).toEqual([{ email: "ana@example.com", password: "longenough" }]);
    },
    () => { authenticated += 1; },
  );
});

test("invalid credentials stay generic and preserve the email", async () => {
  await withLogin(
    async () => {
      throw new OrganizerAuthClientError({ code: "invalidCredentials" });
    },
    async (container) => {
      const email = container.querySelector<HTMLInputElement>('input[type="email"]')!;
      const password = container.querySelector<HTMLInputElement>('input[type="password"]')!;
      await act(async () => setInput(email, "ana@example.com"));
      await act(async () => setInput(password, "wrong"));
      await act(async () => buttonNamed(container, "Sign in").click());
      await waitFor(() => container.textContent?.includes("email or password") === true);
      expect(email.value).toBe("ana@example.com");
      expect(password.value).toBe("wrong");
      expect(document.activeElement).toBe(password);
      expect(password.selectionStart).toBe(0);
      expect(password.selectionEnd).toBe(password.value.length);
      expect(container.textContent).not.toContain("account does not exist");
    },
  );
});

test("language selector translates login without clearing fields", async () => {
  await withLogin(async () => {}, async (container) => {
    const email = container.querySelector<HTMLInputElement>('input[type="email"]')!;
    await act(async () => setInput(email, "ana@example.com"));
    await act(async () => buttonNamed(container, "Español").click());
    expect(container.textContent).toContain("Qué bueno verte de nuevo.");
    expect(email.value).toBe("ana@example.com");
  });
});
```

Create `LoginForm.interaction.test.ts` as an isolated subprocess launcher with a 20-second timeout.

- [ ] **Step 2: Write auth page composition and metadata tests**

Create `src/app/organizer/register/page.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import RegisterPage, { metadata } from "./page";

test("registration page is private and composes the registration flow", () => {
  const html = renderToStaticMarkup(<RegisterPage />);
  expect(html).toContain("What should we call you?");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
```

Create `src/app/organizer/login/page.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage, { metadata } from "./page";

test("login page is private and keeps both credentials together", () => {
  const html = renderToStaticMarkup(<LoginPage />);
  expect(html).toContain('type="email"');
  expect(html).toContain('type="password"');
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
```

- [ ] **Step 3: Run login and page tests to confirm red**

Run:

```bash
rtk bun test src/features/organizer-auth/components/LoginForm.interaction.test.ts src/app/organizer/register/page.test.tsx src/app/organizer/login/page.test.tsx
```

Expected: the login component and auth pages are missing.

- [ ] **Step 4: Implement guarded single-screen login**

Create `LoginForm.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import {
  organizerAuthClient,
  OrganizerAuthClientError,
  type OrganizerAuthClient,
} from "../api/client/organizerAuth.client";
import { organizerAuthMessages } from "../i18n/organizerAuth.messages";
import { loginRequestSchema } from "../schemas/organizerAuth.schema";
import type { OrganizerLanguage } from "../types/organizerAuth.types";
import { AnimatedPrompt } from "./AnimatedPrompt";
import { AuthShell } from "./AuthShell";
import styles from "./OrganizerAuth.module.css";

type LoginErrorCode =
  | "email"
  | "password"
  | "invalidCredentials"
  | "unavailable";

export function LoginForm({
  client = organizerAuthClient,
  initialLanguage = "en",
  onAuthenticated = () => window.location.replace("/organizer"),
}: {
  client?: OrganizerAuthClient;
  initialLanguage?: OrganizerLanguage;
  onAuthenticated?: () => void;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const messages = organizerAuthMessages[language];

  useEffect(() => {
    if (submitting || !error) return;
    const target = error === "email" ? emailRef.current : passwordRef.current;
    target?.focus();
    if (error === "invalidCredentials") {
      target?.select();
    }
  }, [error, submitting]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      const firstField = parsed.error.issues[0]?.path[0];
      setError(
        firstField === "password"
          ? "password"
          : "email",
      );
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await client.login(parsed.data);
      onAuthenticated();
    } catch (reason) {
      setError(
        reason instanceof OrganizerAuthClientError && reason.data.code === "invalidCredentials"
          ? "invalidCredentials"
          : "unavailable",
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AuthShell language={language} onLanguageChange={setLanguage}>
      <form className={`${styles.form} ${styles.loginForm}`} noValidate onSubmit={submit}>
        <h1 className={styles.questionPrompt}>
          <span className="sr-only">{messages.login.title}</span>
          <AnimatedPrompt text={messages.login.title} />
        </h1>
        <div className={styles.loginFields}>
          <label>
            <span>{messages.login.emailLabel}</span>
            <input
              autoComplete="username"
              className={styles.loginField}
              disabled={submitting}
              onChange={(event) => { setEmail(event.target.value); setError(null); }}
              ref={emailRef}
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>{messages.login.passwordLabel}</span>
            <input
              autoComplete="current-password"
              className={styles.loginField}
              disabled={submitting}
              onChange={(event) => { setPassword(event.target.value); setError(null); }}
              ref={passwordRef}
              type="password"
              value={password}
            />
          </label>
        </div>
        {error ? (
          <p className={styles.error} role="alert">{messages.errors[error]}</p>
        ) : null}
        <button className={styles.primary} disabled={submitting} type="submit">
          {submitting ? messages.login.submitting : messages.login.submit}
        </button>
        <p className={styles.accountSwitch}>
          {messages.login.newPrompt} <a href="/organizer/register">{messages.login.registerLink}</a>
        </p>
      </form>
    </AuthShell>
  );
}
```

- [ ] **Step 5: Add login-specific CSS without creating a card-in-card layout**

Append to `OrganizerAuth.module.css`:

```css
.loginForm { width: min(34rem, 100%); gap: 1.5rem; }

.loginFields {
  display: grid;
  width: 100%;
  gap: 1rem;
}

.loginFields label {
  display: grid;
  gap: 0.45rem;
  color: rgb(18 18 18 / 66%);
  font-size: 0.86rem;
  font-weight: 600;
}

.loginField {
  width: 100%;
  min-height: 3.65rem;
  border: 1px solid rgb(18 18 18 / 13%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 68%);
  padding: 0.9rem 1rem;
  color: var(--color-ink);
  font-size: 1rem;
  outline: none;
}

.loginField:focus {
  border-color: var(--color-signal);
  box-shadow: 0 0 0 3px rgb(0 144 222 / 14%);
}

.accountSwitch {
  margin: 0;
  color: rgb(18 18 18 / 55%);
  font-size: 0.86rem;
}

.accountSwitch a {
  color: var(--color-ink);
  text-decoration: underline;
  text-underline-offset: 0.25rem;
}
```

- [ ] **Step 6: Add thin App Router pages with private metadata**

Create `src/app/organizer/register/page.tsx`:

```tsx
import type { Metadata } from "next";
import { RegisterFlow } from "@/features/organizer-auth/components/RegisterFlow";

export const metadata: Metadata = {
  title: "Create an organizer account | Weft",
  description: "Create your Weft organizer account.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterFlow />;
}
```

Create `src/app/organizer/login/page.tsx`:

```tsx
import type { Metadata } from "next";
import { LoginForm } from "@/features/organizer-auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Organizer sign in | Weft",
  description: "Sign in to your Weft organizer account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 7: Run login, registration, page, and architecture tests**

Run:

```bash
rtk bun test src/features/organizer-auth/components/LoginForm.interaction.test.ts src/features/organizer-auth/components/RegisterFlow.interaction.test.ts src/app/organizer/register/page.test.tsx src/app/organizer/login/page.test.tsx tests/architecture.test.ts
rtk tsc
rtk lint
```

Expected: login behavior, both public auth pages, registration regression, architecture boundary, types, and lint pass.

- [ ] **Step 8: Commit login and auth pages**

```bash
rtk git add src/features/organizer-auth/components/LoginForm.tsx src/features/organizer-auth/components/LoginForm.mount.tsx src/features/organizer-auth/components/LoginForm.interaction.test.ts src/features/organizer-auth/components/OrganizerAuth.module.css src/app/organizer/register/page.tsx src/app/organizer/register/page.test.tsx src/app/organizer/login/page.tsx src/app/organizer/login/page.test.tsx
rtk git commit -m "feat(organizer-auth): add organizer login pages"
```

### Task 8: Protect the Dashboard Placeholder and Verify the Whole Feature

**Repository:** `/Users/antoniopertuz/Documents/surnx/weft-web`, with final backend verification in `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend`.

**Files:**
- Create: `src/features/organizer-auth/model/organizerPage.model.ts`
- Create: `src/features/organizer-auth/model/organizerPage.model.test.ts`
- Create: `src/app/organizer/page.tsx`
- Create: `src/app/organizer/page.test.tsx`
- Modify: `src/features/organizer-auth/components/OrganizerAuth.module.css`

**Interfaces:**
- Consumes: Task 3 `readOrganizerSession` and `validateOrganizerSession`; approved exact dashboard copy.
- Produces: `resolveOrganizerPage(sessionToken, validate?)`, decision union `authenticated | redirect | unavailable`, protected dynamic `/organizer` page.

- [ ] **Step 1: Write pure protected-page decision tests**

Create `src/features/organizer-auth/model/organizerPage.model.test.ts`:

```ts
import { expect, test } from "bun:test";
import { resolveOrganizerPage } from "./organizerPage.model";

test("missing session redirects without calling FastAPI", async () => {
  let calls = 0;
  const result = await resolveOrganizerPage(null, async () => {
    calls += 1;
    return { status: "valid" };
  });
  expect(result).toEqual({ status: "redirect" });
  expect(calls).toBe(0);
});

test("valid, invalid, and unavailable sessions remain distinct", async () => {
  expect(await resolveOrganizerPage("token", async () => ({ status: "valid" }))).toEqual({ status: "authenticated" });
  expect(await resolveOrganizerPage("token", async () => ({ status: "invalid" }))).toEqual({ status: "redirect" });
  expect(await resolveOrganizerPage("token", async () => ({ status: "unavailable" }))).toEqual({ status: "unavailable" });
});
```

- [ ] **Step 2: Write exact placeholder and failure presentation tests**

Structure the page file to export presentation-only components, then create `src/app/organizer/page.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OrganizerPlaceholder,
  OrganizerUnavailable,
  dynamic,
  metadata,
} from "./page";

test("protected organizer route is dynamic and private", () => {
  expect(dynamic).toBe("force-dynamic");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("authenticated placeholder uses the exact approved copy", () => {
  const html = renderToStaticMarkup(<OrganizerPlaceholder />);
  expect(html).toContain("your event data will appear here");
  expect(html).not.toContain("Create event");
  expect(html).not.toContain("Sign out");
});

test("temporary backend failure has a retry without pretending logout", () => {
  const html = renderToStaticMarkup(<OrganizerUnavailable />);
  expect(html).toContain('href="/organizer"');
  expect(html).toContain("Try again");
  expect(html).not.toContain("Sign in");
});
```

- [ ] **Step 3: Run protected-page tests to confirm red**

Run:

```bash
rtk bun test src/features/organizer-auth/model/organizerPage.model.test.ts src/app/organizer/page.test.tsx
```

Expected: page model and protected page do not exist.

- [ ] **Step 4: Implement the pure page decision seam**

Create `src/features/organizer-auth/model/organizerPage.model.ts`:

```ts
import {
  validateOrganizerSession,
  type OrganizerSessionOutcome,
} from "../api/server/organizerAuth.gateway";

export type OrganizerPageDecision =
  | { status: "authenticated" }
  | { status: "redirect" }
  | { status: "unavailable" };

export async function resolveOrganizerPage(
  sessionToken: string | null,
  validate: (token: string) => Promise<OrganizerSessionOutcome> = validateOrganizerSession,
): Promise<OrganizerPageDecision> {
  if (!sessionToken) return { status: "redirect" };
  const outcome = await validate(sessionToken);
  if (outcome.status === "valid") return { status: "authenticated" };
  if (outcome.status === "invalid") return { status: "redirect" };
  return { status: "unavailable" };
}
```

- [ ] **Step 5: Implement the protected Server Component**

Create `src/app/organizer/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { resolveOrganizerPage } from "@/features/organizer-auth/model/organizerPage.model";
import styles from "@/features/organizer-auth/components/OrganizerAuth.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Organizer dashboard | Weft",
  description: "Your Weft organizer dashboard.",
  robots: { index: false, follow: false },
};

export function OrganizerPlaceholder() {
  return (
    <main className={styles.dashboardPlaceholder}>
      <h1>your event data will appear here</h1>
    </main>
  );
}

export function OrganizerUnavailable() {
  return (
    <main className={styles.dashboardPlaceholder}>
      <h1>We can't open your dashboard right now.</h1>
      <p>Your session is still here.</p>
      <a className={styles.primary} href="/organizer">Try again</a>
    </main>
  );
}

export default async function OrganizerPage() {
  const decision = await resolveOrganizerPage(await readOrganizerSession());
  if (decision.status === "redirect") redirect("/organizer/login");
  if (decision.status === "unavailable") return <OrganizerUnavailable />;
  return <OrganizerPlaceholder />;
}
```

Append the sparse dashboard surface to `OrganizerAuth.module.css`:

```css
.dashboardPlaceholder {
  display: flex;
  min-height: 100svh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  background: var(--color-bone);
  padding: 2rem;
  color: var(--color-ink);
  text-align: center;
}

.dashboardPlaceholder h1 {
  max-width: 22ch;
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 3.4rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.08;
  text-wrap: balance;
}

.dashboardPlaceholder p {
  margin: 0;
  color: rgb(18 18 18 / 58%);
}

@supports (height: 100dvh) {
  .dashboardPlaceholder { min-height: 100dvh; }
}
```

- [ ] **Step 6: Run all focused organizer-auth tests**

Run from the frontend repository:

```bash
rtk bun test tests/architecture.test.ts src/features/organizer-auth src/app/api/organizer-auth src/app/organizer
rtk tsc
rtk lint
```

Expected: all organizer-auth unit, DOM interaction, route, page, architecture, type, and lint checks pass.

- [ ] **Step 7: Run complete backend verification**

Run from `/Users/antoniopertuz/Documents/surnx/weft-b2b-backend`:

```bash
rtk proxy env UV_CACHE_DIR=/tmp/weft-b2b-uv-cache uv run pytest -q
rtk proxy env UV_CACHE_DIR=/tmp/weft-b2b-uv-cache uv run ruff check .
rtk proxy env UV_CACHE_DIR=/tmp/weft-b2b-uv-cache uv run alembic heads
```

Expected: the full non-live backend suite and Ruff pass, and only `c9a4f2e18d73 (head)` is reported.

- [ ] **Step 8: Run complete frontend verification**

Run from the frontend repository:

```bash
rtk bun test
rtk lint
rtk tsc
rtk bun run build
rtk git diff --check
```

Expected: the complete Bun suite, ESLint, TypeScript, production build, and whitespace check pass.

- [ ] **Step 9: Perform real-browser visual and behavioral QA**

Start the backend and frontend in separate terminals from their respective repositories:

```bash
rtk proxy env UV_CACHE_DIR=/tmp/weft-b2b-uv-cache uv run uvicorn app.main:create_app --factory --reload
```

```bash
rtk bun run dev
```

Verify all of the following in the browser:

1. `/organizer/register` shows the top language selector and exactly one question at a time.
2. Order is name, organization, role, email, password.
3. Role labels and canonical submissions match the approved six options; `Other` opens no input.
4. Changing language updates prompt, buttons, errors, role labels, and registration payload without clearing answers.
5. Prompt letters reveal like the hero; fields remain usable quickly; reduced-motion mode renders complete prompts immediately.
6. Back preserves values; Enter advances text questions; role waits for explicit Continue.
7. Duplicate email returns to the email question and shows a login link.
8. `/organizer/login` shows email and password together, autofill works, and invalid credentials stay generic.
9. Successful registration and login replace history with `/organizer`.
10. Browser storage contains no token or password; the organizer cookie is HttpOnly and has the approved attributes.
11. Valid session displays exactly `your event data will appear here`.
12. Missing or expired session redirects to `/organizer/login`.
13. Stopping FastAPI while a valid cookie exists shows the retry state and does not present the user as logged out.
14. At 320 by 568, 390 by 844, 768 by 1024, and 1440 by 900 viewports, selector, prompt, active control, errors, and actions remain visible without horizontal scrolling.
15. Keyboard-only completion has visible focus, logical order, semantic radio behavior, and no per-character screen-reader announcement.

- [ ] **Step 10: Commit the protected placeholder**

```bash
rtk git add src/features/organizer-auth/model/organizerPage.model.ts src/features/organizer-auth/model/organizerPage.model.test.ts src/app/organizer/page.tsx src/app/organizer/page.test.tsx src/features/organizer-auth/components/OrganizerAuth.module.css
rtk git commit -m "feat(organizer-auth): protect organizer dashboard placeholder"
```

## Completion Criteria

- Backend has one Alembic head and stores one of the six canonical organizer roles for every new registration.
- Existing organizer records remain valid with `role = NULL` until updated by a future profile feature.
- Registration and login pass through same-origin validated BFF routes.
- JWT is present only in the HttpOnly cookie and server-to-server Authorization header.
- Registration has exactly five screens in the approved order; login has one credential screen.
- Language selector stays at the top and changes auth copy plus registration `default_language`.
- WhatsApp is absent from frontend controls and submitted DTOs.
- Prompt motion, reduced motion, mobile viewport behavior, keyboard behavior, and accessible names are verified.
- Successful auth renders the exact protected placeholder; invalid sessions redirect; backend outages retain the session and show retry.
- Focused and complete backend/frontend tests, lint, TypeScript, build, migration-head check, diff check, and browser QA all pass.
