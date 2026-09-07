## Why

Matching is an asynchronous, event-critical workflow, but today its progress is inferred from event state and group presence, unexpected worker failures can be swallowed into raw strings, and frontend transport failures can look like empty rooms. Operators and engineers need a durable view of each matching run, correlated diagnostics across the web and backend services, and recovery guidance that reflects what actually failed.

## What Changes

- Add a durable matching-run lifecycle spanning queueing, execution, success, retryable failure, and terminal failure, with stable run identifiers and safe diagnostic metadata.
- Make the backend matching orchestrator preserve failures for monitoring and retry policy while keeping group persistence atomic and idempotent.
- Return validated matching status and group contracts to the web application instead of inferring progress from loosely typed responses.
- Establish a shared web-to-backend transport boundary with consistent timeout, response-validation, and error-to-HTTP behavior.
- Integrate Sentry in the Next.js application, FastAPI service, and background worker for exception capture, distributed tracing, performance spans, releases, and alerts.
- Integrate PostHog across client and server surfaces for product events and session replay, including organizer and attendee flows without masking displayed or entered product content.
- Keep credentials and reusable secrets—including passwords, cookies, attendee tokens, bearer tokens, and API keys—out of telemetry and replay payloads.
- Replace raw matching exceptions and ambiguous empty states with stable error codes, retryability, correlation references, and recovery actions appropriate to the failure.

## Capabilities

### New Capabilities

- `matching-run-lifecycle`: Durable, queryable, and idempotent matching execution with explicit states and correlated status contracts.
- `operational-observability`: Sentry monitoring and PostHog analytics/session replay across web requests, backend APIs, workers, and matching operations.
- `actionable-matching-errors`: Stable failure classification and accurate recovery behavior for organizers and attendees.

### Modified Capabilities

None. The project has no existing OpenSpec capability specifications.

## Impact

- `weft-b2b-backend`: database schema and migration, event and matching status schemas, matching runner and worker task behavior, API middleware, telemetry adapters, configuration, and tests.
- `weft-web`: Next.js instrumentation, PostHog client/server setup, organizer dashboard gateway and schemas, matching routes and UI states, error boundaries, configuration, and tests.
- API contracts: lock responses and event or matching-status reads gain a run identifier and typed lifecycle/error fields; group and action responses are validated at service boundaries.
- Dependencies and operations: Sentry and PostHog SDKs, deployment secrets, release metadata, source maps, dashboards, alert rules, retention/consent configuration, and cross-service correlation headers.
