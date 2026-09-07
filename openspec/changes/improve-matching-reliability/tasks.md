## 1. Contracts and foundations

- [ ] 1.1 [backend] Add matching-run status, failure-code, and response models in `weft-b2b-backend`, and verify schema tests cover every lifecycle state and public error code.
- [ ] 1.2 [web] Add matching-run, group, action-response, and public-error Zod schemas in `weft-web`, and verify valid fixtures parse while malformed and unknown variants fail.
- [ ] 1.3 [cross-repo] Add shared contract fixtures for lock, status, groups, and failures to both repositories, and verify the Python and TypeScript contract tests accept and reject the same payloads.

## 2. Durable backend matching lifecycle

- [ ] 2.1 [backend] Add the `matching_runs` model and migration with lifecycle fields, diagnostic reference, counts, versions, timestamps, and a database-enforced single-active-run constraint; verify migration upgrade/downgrade and constraint tests pass.
- [ ] 2.2 [backend] Implement matching-run repository operations with monotonic, idempotent transitions, and verify transition tests reject invalid regressions and preserve terminal states on redelivery.
- [ ] 2.3 [backend] Refactor event locking to create or return a durable queued run before job submission, and verify repeated lock requests return the same run without duplicate jobs.
- [ ] 2.4 [backend] Handle queue-submission failure by recording `queue_submission_failed` and restoring a safe event state, and verify no event remains indefinitely locked when defer fails.
- [ ] 2.5 [backend] Queue matching by run ID and make the worker record start, attempt, progress, and terminal state; verify worker redelivery and concurrent delivery do not recompute completed runs.
- [ ] 2.6 [backend] Classify expected and unexpected matching failures, re-raise retryable failures before the attempt limit, and verify automatic retries, final failure, and non-retryable behavior with focused worker tests.
- [ ] 2.7 [backend] Commit scores, groups, membership, versions, event publication, and run success atomically, and verify injected persistence failures expose no partial group set.
- [ ] 2.8 [backend] Add stalled-run detection and reconciliation using the configured progress deadline, and verify abandoned queued/running runs become retryable `stalled` failures while healthy runs remain active.
- [ ] 2.9 [backend] Add authorized current-run status and run-aware retry APIs, extend the lock response, and verify ownership, idempotency, retry eligibility, and response-model tests.
- [ ] 2.10 [backend] Retain `partition_error` as a compatibility field without writing raw exception text, and verify existing clients remain compatible while new status responses carry the actionable failure contract.

## 3. Backend observability

- [ ] 3.1 [backend] Add Sentry and PostHog dependencies, configuration, and application-owned adapters for API and worker processes; verify disabled or unreachable vendors do not prevent startup or matching.
- [ ] 3.2 [backend] Add request IDs and distributed trace propagation through FastAPI and the matching job payload, and verify one lock request retains correlation across API, queue, and worker contexts.
- [ ] 3.3 [backend] Instrument queue delay and matching stages with bounded Sentry spans and safe attributes, and verify test transport output includes run, release, service, stage, duration, and outcome without high-cardinality span names.
- [ ] 3.4 [backend] Capture unexpected exceptions before recovery and emit authoritative, versioned PostHog matching lifecycle events after committed transitions; verify raw exceptions and vendor failures cannot change run state.
- [ ] 3.5 [backend] Add telemetry scrubbing for authorization headers, cookies, attendee tokens, token-bearing URLs, request bodies, answers, embeddings, API keys, and DSNs; verify sentinel credentials never appear in captured Sentry or PostHog payloads.

## 4. Validated web service boundary

- [ ] 4.1 [web] Introduce a server-only validated B2B transport that classifies configuration, timeout, network, upstream HTTP, empty-body, and invalid-contract failures; verify each class with focused transport tests.
- [ ] 4.2 [web] Move organizer matching and group gateways onto the validated transport and central exhaustive HTTP mapping, and verify authorization, entitlement, conflict, not-found, unavailable, and invalid-contract outcomes retain their meaning.
- [ ] 4.3 [web] Propagate request and trace correlation headers from browser-facing routes to the backend, expose a safe diagnostic reference in failure envelopes, and verify tokens and cookies are never reflected.
- [ ] 4.4 [web] Strengthen architecture tests so authenticated backend access, environment-variable reads, and Sentry/PostHog SDK imports remain inside approved server and observability boundaries.

## 5. Web monitoring, analytics, and replay

- [ ] 5.1 [web] Install and initialize Sentry for the supported Next.js client, server, and edge runtimes with release metadata and source-map upload configuration; verify controlled client and server errors resolve to the deployed release.
- [ ] 5.2 [web] Initialize PostHog client and server SDKs with environment, release, and event-schema properties, and verify organizer and attendee identities link browser interactions to server lifecycle events.
- [ ] 5.3 [web] Enable session replay on every organizer and attendee route without masking displayed or entered product content, and verify questionnaire answers, group content, and conversations appear in a controlled replay.
- [ ] 5.4 [web] Exclude passwords, cookies, bearer and attendee tokens, API keys, DSNs, token-bearing URLs, and credential network payloads from replay and telemetry, and verify sentinel secrets are absent from captured output.
- [ ] 5.5 [web] Emit versioned PostHog events for matching request, completion, failure, retry, reveal, organizer failure view, attendee group view, and confirmation; verify event names and properties match the observability spec.

## 6. Actionable matching experience

- [ ] 6.1 [web] Poll validated matching-run status while work is active and load groups after success, and verify queued, running, succeeded, stalled, and failed states render from explicit server evidence.
- [ ] 6.2 [web] Preserve the last valid room during transient polling failures and reserve “No tables yet” for a successful empty response, and verify outage and malformed-payload tests never render an empty-room state.
- [ ] 6.3 [web] Disable lock and reveal whenever current event state cannot be validated, and verify failed initial reads cannot expose either irreversible action.
- [ ] 6.4 [web] Map matching failure code and retryability to refresh, safe retry, readiness correction, or support-reference actions, and verify conflicts do not offer generic unchanged retries.
- [ ] 6.5 [web] Extend attendee group status to distinguish active matching from terminal failure, and verify attendees stop indefinite polling and receive safe event-specific guidance when publication cannot occur.

## 7. Production rollout and verification

- [ ] 7.1 [ops] Provision separate Sentry web/backend projects and one shared PostHog project with chosen region, retention, access controls, environments, releases, and deployment secrets; verify each runtime reports a controlled event.
- [ ] 7.2 [ops] Configure Sentry alerts for terminal matching failures, stalled runs, failure-rate changes, and abnormal duration, and verify each rule routes a controlled notification to its owner.
- [ ] 7.3 [ops] Create PostHog matching conversion and recovery insights linked to session replay, and verify a controlled success and failure journey appear end to end.
- [ ] 7.4 [cross-repo] Run backend unit, migration, worker, and lifecycle suites plus web unit, type, lint, and production-build checks; verify both repositories pass their complete required gates.
- [ ] 7.5 [cross-repo] Exercise lock, queue, retry, success, reveal, polling outage, invalid contract, terminal failure, Sentry trace, PostHog events, and unmasked replay in a deployed end-to-end run, and record run IDs and evidence without recording credentials.
- [ ] 7.6 [cross-repo] Deploy backend additions before web consumers, verify compatibility and rollback switches, then stop raw `partition_error` writes; verify legacy clients continue during the compatibility window.
