## Context

See `proposal.md` for motivation and the three capability specs for observable behavior.

The web application is a Next.js BFF and client. Organizer calls use an HTTP-only session cookie, then `dashboard.gateway.ts` attaches a bearer token to `WEFT_B2B_API_URL`. Dashboard responses are inconsistently validated: some pages use Zod after a generic cast, while groups, lock, and reveal trust `unknown` payloads. Some server pages turn failures into empty arrays, zero counts, or an inferred `open` event.

The FastAPI backend transitions an event to `locked`, queues a Procrastinate task, and later writes groups and changes the event to `published`. The event row is the concurrency lock. Matching computation is mostly pure and persistence is transaction-scoped, which are useful foundations. However, execution has no durable run entity. The runner catches partition exceptions, stores truncated raw text in `Event.partition_error`, reopens the event, and returns, so the queue may see an apparently successful task and monitoring may miss the exception.

Neither repository currently includes Sentry or PostHog. The backend deploys the API and worker separately, so initialization and release metadata must work in both processes. Session replay will cover every web surface without masking product content; reusable credentials remain excluded.

## Goals / Non-Goals

**Goals:**

- Make a matching run durable, queryable, idempotent, retry-aware, and correlated across request and worker boundaries.
- Preserve the pure matching modules while separating orchestration, persistence, error classification, and telemetry.
- Give the web application validated contracts and failure states that never enable irreversible actions from fallback data.
- Use Sentry for errors and performance, and PostHog for behavior and session replay, behind application-owned adapters.
- Make production observability testable and useful without making either vendor part of the matching success path.

**Non-Goals:**

- Changing pair-scoring weights, normalization mathematics, partition heuristics, target group sizes, or the attendee-questionnaire model.
- Replacing Procrastinate, PostgreSQL, FastAPI, Next.js, or the existing polling approach.
- Using PostHog as the canonical matching-run store or Sentry as a workflow engine.
- Recording passwords, authentication material, or reusable secrets.

## Decisions

### 1. Persist matching runs separately from events

Add a `matching_runs` table owned by the backend with an opaque UUID, event ID, status, attempt count, timestamps, heartbeat or progress time, stable failure code, retryability, public diagnostic reference, input/output counts, and algorithm/encoder/parameter versions. A partial unique constraint permits at most one active run for an event.

The event remains the aggregate that controls whether submissions and reveal are allowed. The run records execution history; it does not replace the event lifecycle. `partition_error` remains readable during rollout, then stops carrying raw exceptions and can be removed after both clients use run status.

Alternatives considered:

- Adding more fields to `events` cannot represent retries or retain run history.
- Reading the Procrastinate job table couples the product contract to queue internals and does not describe matching-domain outcomes.
- Inferring status from groups preserves the current ambiguity between queued, stalled, failed, and empty.

### 2. Queue by run ID and keep transitions idempotent

The lock service creates or returns the active run in the same application operation that transitions the event, then queues `partition_at_lock(run_id=...)`. The worker locks the run and event, verifies the transition is still valid, increments the attempt, and exits safely for terminal runs. Queue submission failure becomes a recorded retryable run failure and reopens the event when no work can execute.

Unexpected retryable exceptions are recorded and re-raised so Procrastinate applies its retry strategy. The final attempt classifies the run as failed and restores a safe event state. Expected non-retryable conditions are recorded without wasteful automatic retries. A stalled-run reconciliation check uses the progress deadline to convert abandoned active runs into a visible retryable failure.

### 3. Preserve atomic group publication

Pure loading, normalization, scoring, partition, and assembly remain separate from database writes. Pair scores, groups, memberships, matching metadata, successful run state, and `published` event state commit together. Attempt history can be recorded in its own short transactions, but no attempt may expose partial matching output.

The current event-row lock remains the serialization guard, supplemented by the unique active-run constraint and terminal-state checks. This gives database-enforced protection against duplicate API calls and queue redelivery.

### 4. Expose a run-aware backend contract

`POST /v1/events/{event_id}/lock` returns a validated object containing `run_id` and lifecycle status. Repeating the command while that run is active returns the same object without another enqueue. An authorized event-scoped status endpoint returns the current run summary. Event responses may temporarily retain `partition_error` for compatibility, but new clients use the typed run contract.

Failures expose stable codes and retryability. Initial codes are:

- `no_eligible_attendees`
- `invalid_matching_input`
- `partition_unsatisfied`
- `dependency_timeout`
- `dependency_unavailable`
- `persistence_failed`
- `queue_submission_failed`
- `stalled`
- `internal_failure`

The public payload carries safe copy or a translation key plus a diagnostic reference. It never carries `str(exc)`, stack traces, embeddings, answers, or scoring breakdowns.

### 5. Create a validated web transport boundary

Replace generic unchecked `fetchFromBackend<T>` consumption with a server-only B2B transport that accepts an operation name, authentication context, request options, and a response schema. It classifies configuration, timeout, network, upstream HTTP, empty-body, and invalid-contract failures before feature gateways translate them into domain outcomes.

Feature gateways own endpoint paths and domain schemas. Route handlers use one exhaustive mapping helper for public HTTP responses. Client requests parse the public error envelope and successful matching/group responses. Architecture tests enforce that backend environment variables and authenticated transport calls remain in the shared server boundary and that vendor SDK imports remain in observability adapters.

### 6. Keep Sentry and PostHog behind owned adapters

Create small service-owned interfaces rather than importing vendor SDKs throughout matching logic:

```text
application operation
    +--> durable state
    +--> operational telemetry --> Sentry
    +--> product analytics -----> PostHog
```

Sentry initializes in the Next.js client/server/edge entry points and in both FastAPI API and worker processes. PostHog initializes in the Next.js client for replay and interaction events, and in server processes for authoritative lifecycle outcomes. Vendor calls are best-effort and occur outside matching commit decisions.

Use separate Sentry projects for web and backend under one organization so ownership and alerting remain clear while distributed traces connect them. Use one PostHog project so organizer, attendee, web, API, and worker events can share funnels; attach `service`, `environment`, `release`, and event-schema version properties.

### 7. Correlate requests, jobs, errors, analytics, and replays

Every ingress receives or creates a request ID. Standard trace headers propagate from browser to Next.js and from Next.js to FastAPI. The queue payload carries the run ID and trace continuation data needed to connect the worker. The run ID is the durable correlation key when trace sampling or vendor delivery leaves gaps.

Sentry span names are low-cardinality operations; identifiers are contexts rather than span names. Matching spans cover queue delay, attendee loading, input preparation, normalization, scoring, partitioning, assembly, persistence, and total execution. PostHog lifecycle events use the organizer's stable UUID when known and pseudonymous attendee identity; raw contact fields and matching inputs are not analytics properties.

### 8. Enable unmasked product-content replay with credential exclusion

PostHog replay has no route exclusions for questionnaire, reveal, conversation, organizer, login, or settings surfaces. Displayed and entered product content—including questionnaire answers and conversation text—remains visible as requested.

Credential controls are separate from content masking. Password inputs, cookies, authorization headers, attendee link/session tokens, API keys, DSNs containing secrets, and token-bearing network payloads or URLs are excluded. Replay/network configuration and application wrappers enforce this boundary, and automated tests use sentinel credentials to verify they do not appear in captured payloads.

Replay and trace sample rates are deployment-configurable. Matching lifecycle events and terminal matching errors are always emitted to their configured server-side destinations; delivery failure never changes application behavior.

### 9. Render state from validated evidence

The live dashboard polls matching status while a run is active and groups once publication succeeds. It retains the last valid room during transient polling failures. Unknown event state disables lock and reveal. Empty-state copy appears only after a valid empty response.

Recovery maps from failure code and retryability: refresh for stale event conflicts, safe retry for exhausted transient failures, readiness correction for eligibility failures, and support with a diagnostic reference for terminal internal failures. Attendees see waiting only while a run is legitimately active and receive safe event-specific guidance after terminal failure.

## Risks / Trade-offs

- [Unmasked replay stores sensitive product content] -> Treat this as an explicit product decision, restrict PostHog access, configure retention and regional hosting, audit access, disclose recording appropriately, and keep credentials excluded independently.
- [Telemetry volume or cost grows quickly] -> Use configurable trace and replay sampling while keeping lifecycle outcome events and terminal exceptions unsampled.
- [Dual-writing run state and telemetry can disagree] -> Make PostgreSQL canonical and derive vendor events from committed transitions; include run ID so gaps can be reconciled.
- [Worker retry after an ambiguous commit duplicates output] -> Use transaction boundaries, terminal-state checks, database uniqueness, and idempotent run transitions.
- [Cross-repository rollout breaks compatibility] -> Add backend fields and endpoints first, keep legacy fields during migration, deploy web consumers second, then remove compatibility paths separately.
- [Observability SDK initialization affects startup] -> Validate configuration in CI and deployment checks, initialize per runtime, and degrade telemetry delivery without blocking product traffic.
- [High-cardinality identifiers degrade observability queries] -> Keep IDs out of metric names and span names; use indexed fields only where individual-run lookup is necessary.

## Migration Plan

1. Provision Sentry web/backend projects and one PostHog project; define environments, releases, access, retention, region, source-map credentials, and alert ownership.
2. Add the backend matching-run migration and domain model without changing the existing lock response or `partition_error` behavior.
3. Add backend observability adapters, request correlation, API/worker initialization, and run-aware orchestration behind compatibility fields.
4. Add the run status contract and extend lock responses; verify old web behavior remains functional.
5. Add web Sentry/PostHog initialization, credential exclusions, unmasked replay, correlation propagation, and validated shared transport.
6. Move organizer and attendee matching surfaces to typed run status and actionable errors; retain last-valid-data behavior during polling failures.
7. Validate production source maps, exception capture, traces, analytics, replay linkage, alert delivery, retry/idempotency, and rollback behavior with controlled runs.
8. Stop writing raw `partition_error` text and remove the compatibility field in a later migration after all deployed clients use matching-run status.

Rollback keeps the additive database table and endpoint, disables new consumers and telemetry with deployment configuration, and restores the legacy web reads. Database removal is deferred until after the compatibility window rather than performed during an emergency rollback.

## Open Questions

- Select PostHog US or EU hosting and the retention period before provisioning; these are deployment settings and do not change the application contracts.
- Choose initial Sentry trace and PostHog replay sampling rates after estimating production traffic; all matching lifecycle outcomes remain captured independently of those samples.
