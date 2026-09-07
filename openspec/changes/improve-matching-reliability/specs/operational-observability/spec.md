## Purpose

Provide correlated error monitoring, performance tracing, product analytics, and session replay across the web, API, and worker components involved in matching.

## ADDED Requirements

### Requirement: Failures are captured in Sentry
The system SHALL report unexpected Next.js, FastAPI, worker, and matching-run failures to Sentry with environment, release, service, operation, and safe correlation context.

#### Scenario: Matching computation raises unexpectedly
- **WHEN** the matching worker encounters an unexpected exception
- **THEN** Sentry receives the exception and stack trace correlated with the run and event before application-level recovery is applied

#### Scenario: Frontend contract validation fails
- **WHEN** the web application receives an invalid backend response
- **THEN** Sentry receives a contract-failure event identifying the operation and correlation reference without recording credentials

### Requirement: Matching execution is traced across boundaries
The system SHALL correlate organizer actions, Next.js route handling, backend requests, job queue delay, worker execution, and matching stages into traceable operations.

#### Scenario: Lock initiates matching
- **WHEN** an organizer confirms the lock action
- **THEN** the resulting client request, web route, backend request, queued job, and worker run can be followed using propagated trace context and the durable run identifier

#### Scenario: Matching stages execute
- **WHEN** a matching run loads attendees, normalizes inputs, scores pairs, partitions the room, and persists results
- **THEN** timing and outcome data for those stages is available as bounded, consistently named spans

### Requirement: Product behavior is captured in PostHog
The system SHALL emit versioned PostHog events for matching requests, completion, failure, retry, group reveal, organizer failure views, attendee group views, and attendee confirmation.

#### Scenario: Organizer matching funnel succeeds
- **WHEN** an organizer requests matching and later reveals completed groups
- **THEN** PostHog can relate the request, successful run, and reveal using stable pseudonymous identity and run properties

#### Scenario: Organizer recovers from failure
- **WHEN** an organizer sees a matching failure and invokes its recovery action
- **THEN** PostHog records the failure code and selected recovery path without using raw exception text as an event property

### Requirement: Session replay covers all product surfaces
The system SHALL enable PostHog session replay on organizer and attendee surfaces, including questionnaire, group reveal, and conversation flows, without masking displayed or entered product content.

#### Scenario: Attendee completes a questionnaire
- **WHEN** an attendee session is selected for replay
- **THEN** the replay contains the visible interaction timeline and entered questionnaire content

#### Scenario: Attendee encounters a matching error
- **WHEN** an attendee encounters an actionable matching failure during a recorded session
- **THEN** the replay is linkable to the corresponding product event and safe correlation reference

### Requirement: Credentials never enter observability payloads
The system SHALL exclude passwords, cookies, bearer tokens, attendee tokens, API keys, DSNs containing secrets, and equivalent reusable credentials from Sentry events, PostHog properties, session replay, recorded URLs, and captured network bodies.

#### Scenario: Authentication form is replayed
- **WHEN** a recorded session includes login or password-change UI
- **THEN** the credential value is absent from the replay even though other product content is unmasked

#### Scenario: Authenticated request is observed
- **WHEN** telemetry records an authenticated web or backend request
- **THEN** authorization headers, cookies, token-bearing URL segments, and sensitive request or response bodies are removed before transmission

### Requirement: Telemetry cannot break matching
Sentry and PostHog delivery SHALL be best-effort and SHALL NOT determine transaction commit, matching outcome, API availability, or retry eligibility.

#### Scenario: Observability vendor is unavailable
- **WHEN** Sentry or PostHog cannot accept telemetry
- **THEN** matching and user-facing requests continue according to application state while telemetry delivery failure is handled out of band

### Requirement: Production observability is verifiable
The deployment SHALL expose enough release and environment metadata to verify source maps, backend stack traces, cross-service traces, product events, and replay linkage with controlled test events.

#### Scenario: Release is deployed
- **WHEN** a production release containing observability changes is deployed
- **THEN** operators can verify one web error, one backend or worker error, one cross-service trace, one product event, and one session replay against that release
