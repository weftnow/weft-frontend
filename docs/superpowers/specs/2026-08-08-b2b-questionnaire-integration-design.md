# B2B Questionnaire Integration — Design Specification

**Date:** 2026-08-08
**Status:** Approved design; awaiting written-spec review
**Frontend:** `weft-web` (Next.js 16.2.11)
**Backend:** `weft-b2b-backend` (FastAPI)

## Goal

Connect the conversational attendee questionnaire in `weft-web` to the event-scoped form API in `weft-b2b-backend`. Preserve the current chat-like pacing and responsive presentation while making the flow bilingual, resumable on the same browser, safe to retry, and suitable for production use.

The normal path performs one backend read before the conversation and one backend write after the final answer. The backend does not need chat, streaming, or per-answer endpoints because the conversation is a presentation model, not a server conversation protocol.

Both repositories are in scope. Backend contract changes are implemented and verified before the frontend depends on them.

## Approved Product Decisions

- Attendees enter through an event-specific URL: `/questionnaire/{formToken}`.
- The tokenless `/questionnaire` route shows a friendly missing-link state. Mock questionnaire data remains available only to tests and development fixtures.
- Drafts resume only in the same browser/device. Cross-device drafts are excluded.
- English and Spanish are supported from the first integrated release.
- The organizer's default language is preselected. The attendee may choose `English` or `Español` only on the opening screen; the selector is absent during the conversation.
- A resumed draft continues in its stored language without replaying the opening selector.
- Completion ends with the existing bilingual completion conversation. The attendee waiting/reveal experience is a separate feature.
- Answers are persisted locally after each turn and sent to FastAPI once, after the final answer.
- The final submission is idempotent. A network retry cannot create a duplicate attendee or lose the attendee credential.

## Architecture

The integration uses a server-first Backend-for-Frontend boundary:

```text
Event QR/link
    |
    v
Next.js /questionnaire/{formToken}
    | server-side initial load
    v
server-only B2B questionnaire gateway
    |
    v
FastAPI GET /f/{formToken}/questions

Browser conversation
    | local answer transitions + localStorage drafts
    | same-origin language reload/final submission
    v
Next.js Route Handlers
    | server-to-server HTTP
    v
FastAPI GET questions / POST submit
```

The browser never calls FastAPI directly. This keeps the backend address server-only, avoids opening CORS, centralizes timeouts and error mapping, and follows the repository's established BFF shape.

The B2B backend is configured separately:

```env
WEFT_B2B_API_URL=http://localhost:8000
```

The existing `WEFT_API_URL` and `WEFT_PROXY_KEY` belong to the B2C demo integration and remain unchanged. The new questionnaire gateway must not reuse or redirect those endpoints to the B2B backend.

### Ownership boundaries

FastAPI owns:

- event-token validation;
- organizer-default language;
- event name and submission availability;
- canonical question content and allowed values;
- authoritative submission validation;
- idempotency and persistence;
- check-in and background scoring enqueueing.

Next.js server code owns:

- the B2B backend address;
- initial server-side loading;
- same-origin browser endpoints;
- upstream timeouts and safe error translation;
- runtime validation of upstream responses;
- forwarding the attendee HttpOnly cookie without exposing its token to JavaScript.

The questionnaire client feature owns:

- the opening language choice;
- conversational phase transitions and animation;
- answer validation for immediate feedback;
- same-device draft persistence;
- English/Spanish presentation-only copy;
- mapping backend question definitions to focused composers.

Presentation components do not know about HTTP, backend URLs, cookies, or browser storage.

## Request and User Flow

1. An attendee opens `/questionnaire/{formToken}` from the event QR code or link.
2. The Server Component calls FastAPI without `lang`, which returns the organizer-default language, event metadata, and questions.
3. The opening screen displays the event context and preselects the returned language. The attendee may choose English or Spanish.
4. On a fresh visit, choosing the returned default starts immediately. Choosing the other language fetches `GET /f/{formToken}/questions?lang=en|es` through a same-origin Route Handler, validates it, then starts.
5. On resume, a valid incomplete draft takes precedence over the organizer default. If its stored language differs from the server-rendered definition, the client loads that language before showing the restored conversation; it does not flash or mix languages.
6. Each accepted answer updates the local reducer and durable draft before the next-message animation begins. No backend request occurs between questions.
7. After the final answer, the client builds the flat `FormSubmission` payload, sends it to the same-origin submit Route Handler, and includes its persisted UUID as `Idempotency-Key`.
8. The Route Handler validates the request, forwards it to FastAPI, forwards the backend's attendee `Set-Cookie`, and returns only a browser-safe completion result.
9. The client records a completed marker and renders the two localized completion messages.
10. Refreshing after completion restores the completion state from the same-browser record. The attendee token is never stored in localStorage.

## Backend Contract Changes

### Questionnaire definition

`GET /f/{form_token}/questions?lang=en|es` remains the canonical read endpoint. Its response gains:

- `event_name: str` for the opening screen;
- `accepting_submissions: bool`, derived from the same state rule used by submission;
- strict `Language` and question-type literals in the Pydantic response models;
- semantic input metadata and exact maximum lengths for text questions;
- `max_select` where a multi-choice upper bound exists.

The endpoint still returns `form_version`, the resolved `language`, and the ordered question list. Omitting `lang` continues to select the organizer's default. Unsupported languages continue to return `422`.

Question definitions use these public types:

- `short_text`
- `long_text`
- `single_choice`
- `multi_choice`

Text questions expose a semantic format sufficient for the browser to derive `type`, `inputMode`, and `autoComplete` without hard-coding behavior from the question key. Formats cover normal text, name, email, telephone, and organization. Question metadata and submission validation use the same length constants:

- name: 200 characters;
- email: 254 characters;
- phone: 32 characters;
- company: 200 characters;
- `t1` and `t2`: 1,000 characters each.

Option values remain `str | int`. Their types are load-bearing for matching and must not be stringified by either API layer.

The definition endpoint may still return questions while `accepting_submissions` is false so the frontend can render an intentional unavailable state. `POST /submit` remains authoritative and rechecks state inside the transaction.

### Final submission

`POST /f/{form_token}/submit` keeps the existing flat domain-answer fields and gains:

- `form_version: str`;
- `language: Language`;
- required `Idempotency-Key: UUID` request header.

The language and form version are stored with the raw response because wording/version differences matter to future analysis and re-encoding. A submission whose `form_version` does not equal the active backend version returns `409` rather than being interpreted under a different definition.

Idempotency is event-scoped. The database stores the client submission UUID with the attendee and enforces a unique constraint on `(event_id, client_submission_id)`.

- First use of a key creates the person/attendee/response, checks the attendee in, enqueues scoring, and returns `201` with the attendee token.
- Repeating the same key with the same canonical payload returns the existing attendee token, refreshes the attendee cookie, and does not enqueue work again.
- Reusing the same key with different content returns `409`.

The idempotency lookup happens before the existing duplicate-person conflict. Existing duplicate-person behavior for a different idempotency key remains unchanged.

The backend's attendee cookie remains HttpOnly, `SameSite=Lax`, and one day in duration. Production configuration sets `Secure`; local HTTP development explicitly disables it. The Next.js Route Handler forwards the upstream cookie to the browser's frontend origin and removes `attendee_token` from the JSON response.

### Submission remains fast

No scoring or language-model call is added to the HTTP critical path. The service stores the raw response, flushes the attendee, enqueues the existing background task, and responds. Published/live latecomer insertion behavior remains unchanged.

## Frontend State and Module Design

The current `questionnaire.api.ts` combines mock transport, domain transitions, and storage. The integration splits those responsibilities into focused units while retaining the presentational components and their motion behavior.

The feature contains clear boundaries for:

- backend response/request Zod schemas;
- a pure backend-definition-to-UI mapper;
- typed English/Spanish UI messages;
- a pure questionnaire reducer and selectors;
- versioned draft serialization/storage with an in-memory fallback;
- browser API calls for language reload and final submission;
- server-only FastAPI gateway functions;
- small Route Handlers;
- existing conversation and composer presentation.

React Query no longer models every answer as server state. The questionnaire definition is initial server data, the active conversation is local reducer state, and final submission is the only mutation. This removes redundant query-cache snapshots and makes local persistence explicit.

### Draft shape

One validated, versioned record is stored per event form token. It contains:

- local draft-schema version;
- backend `form_version`;
- selected `language`;
- answers keyed by backend question key;
- current question index;
- client-generated idempotency UUID;
- `draft | completed` status;
- last-updated ISO timestamp.

Conversation strings are not persisted. They are derived from the current localized definition and saved answers. This avoids stale translations and keeps the record small.

Storage behavior:

- missing record creates a fresh draft;
- corrupt or structurally invalid data is discarded safely;
- a backend form-version mismatch resets an incomplete draft with a localized explanation and a new idempotency key;
- unavailable localStorage falls back to memory for the active visit;
- accepted answers are persisted before advancing animation;
- successful completion removes answers and personal fields, then records only the completed marker, language, form version, and non-sensitive draft metadata;
- a completed record remains completed if the backend later publishes another form version for the same event;
- no form token, attendee token, email, phone, or answers are logged.

The event form token is already a URL capability. It may scope the storage key, but the attendee token returned after submission is never readable by client JavaScript or saved in browser storage.

### Bilingual presentation

FastAPI supplies localized domain questions and option labels. A small typed frontend dictionary supplies presentation-only text:

- opening title, explanation, and language labels;
- loading and missing-link states;
- Continue, Skip, send, and selection guidance;
- validation and network errors;
- version-reset explanation;
- completion messages.

English and Spanish dictionaries implement the same compile-time key set. No general-purpose internationalization dependency is introduced for two fixed languages.

The language selector appears only before the first answer. Once started, the selected language is fixed for that draft. A resumed draft bypasses the selector and restores its stored language.

### Composer mapping

- `short_text` maps to a single-line composer. Semantic metadata determines email/telephone keyboard and autocomplete behavior.
- `long_text` maps to a multiline composer with the backend-provided maximum length.
- `single_choice` maps to the existing accessible radio-style composer and preserves string or numeric values.
- `multi_choice` maps to the existing checkbox-style composer, enforcing `min_select` and `max_select` while preserving selection order.
- Optional text questions expose a localized Skip action and submit `null`/omission as required by the backend adapter; empty strings are not sent for optional typed fields.

The existing hybrid composer may remain as an isolated presentation capability, but it is not part of the B2B backend contract and is not used by the production questionnaire definition.

## Next.js Server Boundary

The page route is `/questionnaire/[formToken]`. It is a small Server Component that:

- awaits the Next.js 16 async route parameters;
- validates the token shape and length before interpolation;
- calls the server-only B2B gateway directly rather than making an HTTP request to its own Route Handler;
- opts out of caching for token-scoped event state;
- passes the validated initial definition to the client boundary;
- renders dedicated invalid, missing, and unavailable states without exposing upstream details.

Same-origin Route Handlers support:

- reloading the definition in the other language before the conversation starts;
- final submission and upstream-cookie forwarding.

Both handlers validate untrusted browser input. The gateway URL-encodes route parameters, uses explicit timeouts, parses every successful upstream body with Zod, and maps failures to a small frontend error vocabulary. It never logs bearer tokens, payload contents, upstream URLs containing tokens, or raw backend exceptions.

## Error Handling

The UI receives stable error codes plus localized presentation copy:

| Condition | Behavior |
|---|---|
| Missing tokenless link | Show instructions to use the organizer's event link or QR code |
| Invalid form token (`401`) | Show an invalid-link screen; do not retry automatically |
| Missing event (`404`) | Show an event-unavailable screen |
| Event not accepting submissions (`409` or bootstrap flag) | Show a retry action without entering the conversation |
| Unsupported language (`422`) | Treat as a client-contract defect and fall back to the validated current definition |
| Final validation drift (`422`) | Preserve the draft, return to the affected question when its field can be identified, and show localized guidance |
| Stale form version (`409`) | Reset against the current definition with a localized explanation |
| Idempotency-key payload conflict (`409`) | Preserve the draft and show a non-destructive support/retry message; never mint a new key automatically |
| Timeout or `5xx` | Keep every answer and show a final Retry action using the same idempotency key |
| Successful idempotent replay | Complete normally without indicating a duplicate |

Duplicate interaction is guarded in the reducer and controls. Network errors never append completion messages or mark the draft complete. Timers are cleaned up on unmount as in the existing conversation flow.

## Performance and Security

- The normal path uses one initial read and one final write.
- Selecting or resuming in the non-default language adds one pre-conversation read.
- No answer produces a network request.
- Token-scoped reads use explicit `no-store` behavior in both Server Component fetches and Route Handlers.
- Draft writes are small synchronous localStorage operations and occur once per accepted answer, not per keystroke.
- No additional state-management, chat, or internationalization dependency is added.
- Backend addresses and configuration remain server-only.
- CORS remains closed because browsers call only their Next.js origin.
- Route parameters and bodies have explicit size/shape validation.
- The attendee token remains HttpOnly and absent from browser-visible JSON/storage.
- Form and attendee tokens are redacted from logs.

## Testing Strategy

Implementation follows test-driven development in both repositories.

### Backend

- Definition tests pin English/Spanish labels, strict question types, event metadata, semantic formats, option value types, selection limits, and shared maximum lengths.
- Request/API tests accept valid bilingual submissions and reject stale versions, invalid languages, oversized fields, and missing idempotency headers.
- Service/API tests prove first submission, identical replay, conflicting replay, different-key duplicate-person behavior, cookie refresh, and single job enqueue.
- Existing tests continue proving that submission checks in the attendee, stores raw answers, enqueues scoring, and inserts latecomers after publish/reveal.
- Migration tests or schema inspection prove the event-scoped idempotency uniqueness constraint.

### Frontend

- Contract-schema tests cover every backend question type and reject malformed definitions.
- Mapper tests prove numeric options remain numeric, optional values normalize correctly, and backend limits reach composers.
- Reducer tests cover opening, language choice, every answer transition, duplicate guards, final submission, retry, version reset, and completion.
- Storage tests cover fresh, resumed, corrupt, unavailable, mismatched-version, and completed records.
- Dictionary tests prove English and Spanish expose identical keys.
- Composer tests cover optional Skip, email/telephone semantics, multiline behavior, numeric single-choice values, multi-choice limits, keyboard access, and errors.
- Gateway and Route Handler tests cover request validation, URL encoding, `no-store`, timeout, every supported upstream status, response-schema rejection, cookie forwarding, and attendee-token removal.
- Full interaction tests walk all 17 backend-shaped questions in English and Spanish, including refresh before completion and final retry.
- Existing questionnaire motion, reduced-motion, scroll-following, responsive-layout, and accessibility tests remain green.

### Final verification

- Backend: focused tests, complete non-live pytest suite, Ruff, and migration upgrade against the test database.
- Frontend: focused Bun tests, complete Bun suite, ESLint, TypeScript through the production Next.js build, and `git diff --check`.
- Integrated smoke test: run both services locally, load a real event token, complete English and Spanish submissions, simulate a retry with the same idempotency key, verify one attendee/response/job, and confirm no attendee token appears in browser storage or JSON.
- Browser QA covers a representative phone, small laptop, desktop, keyboard-only completion, reduced motion, refresh resume, optional skips, and unavailable-event states.

## Delivery Order

1. Harden and extend the FastAPI contract, data model, migration, and idempotent service behavior.
2. Build the isolated Next.js B2B gateway and Route Handler contract with mocked-upstream tests.
3. Replace the mock questionnaire runtime with backend schemas, mapping, local reducer, persistence, and bilingual copy.
4. Wire the event-token page, opening language screen, composers, final submission, cookie handling, and error states.
5. Run repository-level and two-service integration verification.

Each stage leaves a testable boundary. The frontend is not switched from mock runtime data until the backend contract and gateway tests are green.

## Acceptance Criteria

- A valid event link loads the organizer-default language without exposing the FastAPI URL to the browser.
- The opening screen permits English or Spanish selection and no language control appears after the conversation starts.
- All 17 backend questions render with the correct composer, localized wording, constraints, and value types.
- Refreshing mid-question resumes every accepted answer and the correct next question on the same browser.
- The normal conversation performs no per-answer network requests.
- A complete submission creates one checked-in attendee, one raw response, and one scoring job.
- Retrying after an ambiguous network result with the same idempotency key returns the same attendee and does not enqueue twice.
- A stale form definition cannot be submitted silently.
- Completion is bilingual and remains the terminal UI for this scope.
- The attendee token exists only in an HttpOnly cookie, not JavaScript-visible JSON or localStorage.
- Existing B2C API behavior and configuration remain unchanged.
- Both repositories pass their full non-live verification suites and the two-service smoke test.

## Out of Scope

- Cross-device or account-based draft synchronization.
- Per-answer backend persistence or chat/streaming endpoints.
- Editing or navigating backward through accepted answers.
- Attendee waiting, table reveal, matching-result, or feedback pages.
- Additional languages beyond English and Spanish.
- Organizer questionnaire-building tools.
- Analytics, funnel instrumentation, or experimentation infrastructure.
- Changes to the matching formulas, ML providers, or worker topology.
- Changes to the existing B2C compatibility-test backend contract.
