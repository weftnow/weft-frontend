## Purpose

Give organizers and attendees accurate, stable, and recoverable matching failure states while preserving detailed diagnostics for engineers.

## ADDED Requirements

### Requirement: Matching failures use stable classifications
The backend SHALL classify matching failures using stable codes, retryability, and a safe public message while retaining raw exception detail only in protected diagnostics.

#### Scenario: No eligible attendees exist
- **WHEN** matching cannot start because no checked-in attendee has usable input
- **THEN** the run fails with a non-retryable eligibility code and guidance to reopen or correct event readiness

#### Scenario: A dependency times out
- **WHEN** matching fails because a required dependency times out
- **THEN** the run records a retryable dependency-timeout code and preserves the exception in operational monitoring

#### Scenario: Partition constraints cannot be satisfied
- **WHEN** the matching algorithm cannot form a valid partition from otherwise valid inputs
- **THEN** the run records a stable partition-unsatisfied code without returning algorithm internals to the organizer

#### Scenario: Unknown exception occurs
- **WHEN** a failure does not match a known classification
- **THEN** the run records a stable internal-failure code and a correlation reference while Sentry retains the exception detail

### Requirement: Web boundaries preserve meaningful failures
The web application SHALL distinguish authorization, entitlement, validation, conflict, not-found, timeout, upstream-unavailable, invalid-contract, and matching-run failures through shared typed mappings.

#### Scenario: Lock conflicts with event state
- **WHEN** the backend rejects a lock or reveal because the event has already transitioned
- **THEN** the web route and client preserve a conflict outcome and direct the organizer to refresh current state instead of presenting a generic retry

#### Scenario: Group response is invalid
- **WHEN** the backend returns a successful HTTP status with an invalid group payload
- **THEN** the web application reports an invalid-contract failure and never renders the malformed payload as a room

### Requirement: Failed reads never masquerade as empty data
The interface SHALL distinguish a genuinely empty room from an authorization failure, service outage, timeout, or invalid response.

#### Scenario: Groups service is unavailable
- **WHEN** an organizer opens or polls the room while the groups request is unavailable
- **THEN** the existing room data is preserved when available and the UI shows a retrying or recovery state rather than “No tables yet”

#### Scenario: Initial event read fails
- **WHEN** the live dashboard cannot establish the event state
- **THEN** irreversible matching and reveal actions remain unavailable until a valid state is loaded

### Requirement: Recovery follows failure semantics
Every user-visible matching failure SHALL provide a recovery action appropriate to its retryability and current event state.

#### Scenario: Retryable run fails
- **WHEN** a matching run reaches a retryable failure after automatic attempts are exhausted
- **THEN** the organizer can retry safely using the run-aware action and sees that no partial groups were published

#### Scenario: Failure needs input correction
- **WHEN** a matching failure is not retryable without changing event readiness or input
- **THEN** the organizer is directed to the relevant corrective action rather than offered an unchanged retry

#### Scenario: Failure cannot be self-recovered
- **WHEN** no safe automated or organizer action can resolve the failure
- **THEN** the UI provides a correlation reference suitable for support without exposing internal error detail

### Requirement: Attendee states remain accurate during matching
Attendee-facing group status SHALL distinguish ordinary waiting, event completion, lost session, temporary unavailability, and terminal matching failure when each condition is known.

#### Scenario: Matching is still active
- **WHEN** the attendee requests a group while the current run is queued or running
- **THEN** the attendee continues to see a waiting state rather than an error or empty group

#### Scenario: Matching terminates unsuccessfully
- **WHEN** matching reaches a terminal failure that prevents group publication
- **THEN** the attendee sees safe event-specific guidance and is not left polling indefinitely
