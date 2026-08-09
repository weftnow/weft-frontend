# Organizer Authentication Design

## Summary

Build a branded organizer authentication experience with two entry points:

- `/organizer/register` for new organizers, presented as a one-question-per-screen flow.
- `/organizer/login` for returning organizers, presented as one conventional screen with email and password together.

Both flows authenticate against the existing FastAPI backend through same-origin Next.js Route Handlers. The backend JWT is stored only in a secure HttpOnly cookie. Successful authentication lands on a protected `/organizer` placeholder containing the exact text `your event data will appear here`.

The existing backend registration contract is extended with an organizer role. WhatsApp remains supported by the backend but is not requested or sent by this frontend flow.

## Goals

- Support organizer registration and returning-organizer login.
- Keep the backend JWT inaccessible to browser JavaScript.
- Follow the frontend repository's feature-based architecture and BFF pattern.
- Preserve the existing Weft brand: Comfortaa display type, Geist Mono support type, bone, ink, ember, and signal colors, restrained ambient texture, rounded controls, and purposeful motion.
- Give every registration question its own viewport-sized screen.
- Animate each registration prompt letter by letter using the landing hero's clip, opacity, and vertical-rise language.
- Keep login compatible with password managers by showing email and password together.
- Make English and Spanish available from a persistent selector at the top of both auth experiences.
- Persist the selected registration language as the organizer's `default_language`.
- Add a required organizer role without inventing values for existing organizer records.
- Provide accessible keyboard, focus, reduced-motion, validation, and error behavior.
- Leave a clean authenticated seam for the later organizer dashboard.

## Non-goals

- Building the organizer dashboard, event list, event creation, analytics, or navigation.
- Adding password reset, email verification, social login, refresh tokens, remember-me controls, or multi-factor authentication.
- Adding logout UI to the placeholder dashboard.
- Persisting registration drafts across refreshes or devices.
- Collecting WhatsApp during registration.
- Collecting free text when the organizer selects `Other` as a role.
- Modifying the public landing-page navigation or its existing `Try it!` path.
- Changing attendee authentication or questionnaire behavior.
- Adding a new component or design-system dependency.

## Confirmed Backend Contract

### Existing login

`POST /v1/auth/login` accepts:

```json
{
  "email": "organizer@example.com",
  "password": "at-least-eight-on-registration"
}
```

It returns `access_token` and `token_type`. Invalid credentials return `401` with the existing domain-error body.

### Existing registration fields

`POST /v1/auth/register` currently accepts:

- `contact_name`: required, trimmed, 1 to 200 characters.
- `organization_name`: required, trimmed, 1 to 200 characters.
- `email`: required, valid email.
- `password`: required, at least 8 characters.
- `timezone`: valid IANA timezone, default `UTC`.
- `default_language`: `en` or `es`, default `en`.
- `whatsapp`: optional, at most 40 characters.

Registration returns an immediately usable JWT and the organizer representation. Duplicate email returns `409`.

### Role extension

Add the following canonical role values:

| Stored value | English label | Spanish label |
| --- | --- | --- |
| `founder` | Founder | Fundador/a |
| `community_manager` | Community Manager | Community Manager |
| `event_manager` | Event Manager | Event Manager |
| `operations` | Operations | Operaciones |
| `marketing_lead` | Marketing lead | Líder de marketing |
| `other` | Other | Otro |

The backend database column is nullable so existing organizers remain accurate instead of being assigned a guessed role. `RegisterRequest.role` is required for every new organizer. `OrganizerOut.role` is nullable because legacy organizer records may not have one. New registration writes always store a supported canonical value.

## Route Architecture

### UI routes

- `GET /organizer/register`: registration page with private metadata and a client-side registration flow.
- `GET /organizer/login`: single-screen login page with private metadata and a client-side login form.
- `GET /organizer`: dynamic protected Server Component that validates the session directly against FastAPI before rendering the placeholder.

The auth pages are direct entry points. They link to one another but do not alter the public landing navigation in this scope.

### Browser-facing BFF routes

- `POST /api/organizer-auth/register`
- `POST /api/organizer-auth/login`

These Route Handlers are public HTTP endpoints and therefore validate content type and body shape before calling FastAPI. They return only safe, frontend-owned status codes. They never return the JWT, upstream request body, password, or upstream diagnostic detail.

### Server gateway

Feature-owned server code is the only organizer-auth module that reads `WEFT_B2B_API_URL`. It provides three operations:

- Register an organizer.
- Log in an organizer.
- Validate an organizer access token by calling protected `GET /v1/events` with `Authorization: Bearer <token>` and `cache: "no-store"`.

The protected `/organizer` Server Component calls the gateway directly. It does not fetch the application's own Route Handler, avoiding an unnecessary internal HTTP round trip and following the bundled Next.js 16 BFF guidance.

## Session Design

The FastAPI JWT remains the authentication authority. Next.js treats it as an opaque token and stores it in a cookie named `weft_organizer_session` with:

- `httpOnly: true`
- `secure: process.env.NODE_ENV === "production"`
- `sameSite: "lax"`
- `path: "/"`
- `maxAge: 60 * 60 * 24 * 7`

The seven-day browser lifetime matches the backend's current default JWT lifetime. FastAPI still verifies expiration and organizer existence on every protected request.

The browser receives only `{ "status": "authenticated" }` after a successful registration or login. Client code then replaces browser history with `/organizer` so Back does not return to a completed credential form.

No auth value, password, or draft is stored in `localStorage` or `sessionStorage`.

## Registration Experience

### Top-level language selector

A compact `English | Español` selector remains visible at the top of every registration screen. It controls auth-interface copy and the `default_language` value sent at registration. The initial selection is English, matching the current backend default and root document language.

Changing language updates the visible prompt and controls without discarding entered answers or restarting the flow. The selected role remains the same canonical value while its visible label changes.

### Question order

The visible registration order is:

1. Contact name: `What should we call you?`
2. Organization name: `What organization are you hosting with?`
3. Role: `What's your role?`
4. Email: `What's your work email?`
5. Password: `Create a password.`

This order establishes personal and organizational context before asking for credentials. There are no optional screens. WhatsApp is omitted from the request, allowing the backend to store its existing `null` default.

### Role control

Role is a keyboard-accessible single-choice group with the approved options:

- Founder
- Community Manager
- Event Manager
- Operations
- Marketing lead
- Other

Selecting a role stores its canonical value. `Other` does not open a second input.

### Timezone

The browser captures `Intl.DateTimeFormat().resolvedOptions().timeZone` at submission time. An empty, unavailable, or throwing browser implementation falls back to `UTC`. Timezone is never presented as a question.

### Step mechanics

- Only the active question and its answer control are visible.
- A restrained progress indicator communicates the current position out of five.
- Continue validates the current value before advancing.
- Enter advances text fields and submits the final password step.
- Role selection may enable Continue but does not auto-advance, preventing accidental progression.
- Back preserves answers in reducer state.
- The first screen links to login for an organizer who already has an account.
- A submission in-flight guard prevents duplicate registration requests.

The final password step submits the complete registration payload. During submission, controls are disabled and the primary action exposes a clear busy label.

## Login Experience

Login is one centered screen. It contains:

- The persistent language selector.
- An animated `Welcome back.` headline.
- Conventional visible labels for email and password.
- Email and password inputs together.
- A primary `Sign in` action.
- A secondary link to `/organizer/register`.

The fields use `autocomplete="username"` and `autocomplete="current-password"`. Enter submits from either field through one guarded form submission. Invalid credentials produce one generic message and never identify whether the email exists.

## Visual and Motion Direction

The auth shell uses the established application tokens and assets:

- Comfortaa for display text and primary controls.
- Geist Mono for progress, helper, and compact selector text.
- Bone background, ink text, ember primary action, signal focus treatment, and muted ash support text.
- Existing Weft logo asset.
- Subtle ember and signal ambient fields plus the restrained questionnaire texture.
- Soft, consistent radii and no nested card stack.

Registration prompts are large, centered, balanced, and sized to remain readable on compact mobile screens. The answer control sits directly below the prompt and remains visually subordinate.

Prompt motion follows the landing hero instead of importing a new typewriter metaphor:

- Split the prompt into words and characters.
- Reveal characters by animating `clip-path`, opacity, and a small vertical transform.
- Use the existing hero easing family.
- Bound total prompt duration so repeated steps stay responsive.
- Animate only the newly active prompt.
- Fade and translate the answer control into place without waiting for a long decorative pause.

Step transitions use `AnimatePresence` in `mode="wait"` and animate only opacity and transform. All animation becomes immediate when reduced motion is requested.

## Accessibility

- Every input has an actual programmatic label. Visible animated glyphs are hidden from assistive technology, while the complete prompt is exposed once.
- Character animation never causes per-character live-region announcements.
- Complete prompts, progress, validation failures, and request failures use appropriate semantic text and live regions.
- Focus moves to the new answer control after a step transition, not during individual character updates.
- Back, Continue, role options, language selector, and submit actions are keyboard reachable with visible signal-blue focus rings.
- Role uses a semantic radio group.
- The language selector exposes selected state and updates the page section language.
- Reduced motion renders complete prompts and skips nonessential transitions.
- The shell uses stable dynamic viewport units and safe-area padding.
- Mobile layouts account for the on-screen keyboard without hiding the active field or primary action.
- Text, placeholders, errors, focus rings, and actions meet WCAG AA contrast.

## Validation and Mapping

Frontend contract schemas mirror FastAPI exactly:

- Trim contact and organization names before submission.
- Validate email syntax.
- Require a password of at least eight characters.
- Require one supported role.
- Require `en` or `es`.
- Produce a non-empty IANA timezone or use `UTC`.

Validation runs at two boundaries:

1. Per-step client validation for immediate guidance.
2. Complete body validation in the public Route Handler before any upstream call.

FastAPI remains authoritative. A backend `422` response is mapped to the affected frontend field when its location is safe and recognized.

## Failure Behavior

Use frontend-owned failure codes:

- `validation`, optionally with a recognized field.
- `emailAlreadyRegistered`.
- `invalidCredentials`.
- `unavailable`.

Behavior by failure:

- Client validation keeps the organizer on the current step and focuses the invalid control.
- Duplicate email returns registration to the email step, preserves other values in memory, and offers a login link.
- Backend field validation returns to the corresponding registration step.
- Invalid login credentials remain on the login screen with the password selected for correction.
- Network, timeout, malformed upstream body, and unexpected upstream status map to `unavailable` without leaking details.
- Unavailable registration or login preserves the in-memory values and allows retry.
- Logs contain the operation and safe status category only. They do not contain email, password, role payload, token, upstream URL parameters, or response details.

All BFF responses set `Cache-Control: no-store`.

## Protected Placeholder Behavior

The `/organizer` page reads `weft_organizer_session` with the asynchronous Next.js 16 `cookies()` API and asks FastAPI to validate it through `GET /v1/events`.

- Missing cookie: redirect to `/organizer/login`.
- Backend `401` or `403`: redirect to `/organizer/login`.
- Valid response: render a sparse branded page containing exactly `your event data will appear here`.
- Network failure, timeout, malformed response, or backend `5xx`: retain the cookie and render a retryable unavailable state. A temporary backend problem is not treated as logout.

The event response is validated but not rendered in this scope. This call becomes the data seam for the future dashboard without introducing a temporary `/me` endpoint.

## State Boundaries

Use feature-owned local state rather than a new global provider or TanStack Query:

- A reducer owns registration step, field values, language, field errors, submission error, and submission phase.
- The login component owns its two field values and submission state.
- Motion components own only ephemeral presentation completion.
- The API client owns browser fetch and safe error decoding.
- The server gateway owns FastAPI transport, timeout, response parsing, bearer authorization, and safe upstream failure mapping.
- Route Handlers own browser request validation, cookie creation, and public response shape.
- The Server Component owns the protected-page redirect/render decision.

No component reads backend environment variables, parses JWTs, or writes cookies.

## Testing Strategy

### Backend

- Migration test proves existing organizer rows receive `NULL`, not a guessed role.
- Registration rejects a missing role.
- Registration accepts every supported role and returns the canonical value.
- Registration rejects unsupported role values.
- Registration continues to store contact, organization, timezone, language, and nullable WhatsApp.
- Login behavior remains unchanged.
- Organizer output never exposes password or hash data.

### Frontend unit and contract tests

- Registration schemas accept all canonical roles and reject unsupported values.
- Field validation trims names and validates email and password constraints.
- Timezone resolution uses the browser IANA zone and falls back to `UTC`.
- Reducer follows the five-step order, preserves values on Back, and moves to a server-identified invalid step.
- Localized role labels map to the same canonical role values.
- Safe error parsing rejects unknown codes and fields.

### Frontend component interaction tests

- Only one registration question is visible at a time.
- Login renders email and password together.
- Language changes copy without clearing state and reaches the registration payload.
- Role is required and keyboard selectable.
- Back and Enter behavior follow the approved flow.
- Duplicate email returns to the email step with a login link.
- Invalid login credentials remain generic.
- Submission guards prevent double requests.
- Reduced motion skips progressive character revelation.
- The prompt exposes one complete accessible label, not individual characters.
- Focus advances to the active control and returns to invalid controls.

### Route and server gateway tests

- Invalid content type or body is rejected before FastAPI is called.
- Register and login URLs, methods, body, timeout, and no-store options are exact.
- Upstream responses are parsed with Zod.
- Successful routes return no JWT and set the expected HttpOnly cookie attributes.
- Duplicate, credential, validation, timeout, malformed, and unavailable failures map to safe public responses.
- Logs and public bodies do not contain upstream details or secrets.
- Protected validation sends the cookie as a bearer token only to FastAPI.

### Page and presentation tests

- Auth metadata is private and not indexable.
- Missing and invalid sessions redirect to login.
- Valid sessions render the exact placeholder copy.
- Backend unavailability renders the retryable state without deleting the cookie.
- Compact mobile and desktop layout assertions cover stable viewport sizing, centered prompts, visible actions, and top language selector placement.

### Final verification

- Run focused backend auth and migration tests.
- Run focused frontend organizer-auth tests.
- Run the complete backend test suite.
- Run the complete frontend Bun test suite, lint, TypeScript check, and production build.
- Inspect registration, login, reduced motion, keyboard flow, narrow mobile, desktop, duplicate email, invalid credentials, and protected placeholder in a real browser.

## Implementation Boundaries

Frontend organizer-auth code lives under `src/features/organizer-auth`. App Router files remain thin composition and HTTP boundaries under `src/app/organizer` and `src/app/api/organizer-auth`. Shared landing and attendee features are not imported into organizer-auth except for truly global brand assets or UI primitives.

The backend change stays within its existing model, schema, auth route, migration, and auth test boundaries. It does not add a new service layer or endpoint.

## Approved Decisions

- Build both registration and login.
- Login keeps email and password on one screen.
- Registration uses one question per screen.
- Language is a selector at the top instead of a question step.
- WhatsApp is omitted for now.
- Role is required with the six approved choices.
- Role is persisted through a minimal backend extension.
- Registration optional fields do not interrupt the required-field sequence.
- Successful auth lands on a protected blank dashboard placeholder.
- Use the current application brand and hero-style letter reveal.
- Use the same-origin BFF and HttpOnly-cookie architecture.
