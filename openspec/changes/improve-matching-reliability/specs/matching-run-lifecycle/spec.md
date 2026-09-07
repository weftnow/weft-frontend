## Purpose

Define a durable and externally observable lifecycle for each event matching run so execution, retries, completion, and failures remain reliable across API and worker boundaries.

## ADDED Requirements

### Requirement: Matching commands create a durable run
When an organizer locks an eligible event, the system SHALL persist a matching run before queueing its background work and SHALL return the run identifier and current status to the caller.

#### Scenario: First matching request
- **WHEN** an authorized organizer locks an eligible event
- **THEN** the system persists one run in `queued` state, queues work for that run, and returns its identifier and status

#### Scenario: Queue submission fails
- **WHEN** the system persists a run but cannot submit its worker job
- **THEN** the system records a retryable failure for that run and returns an actionable failure without leaving the event indefinitely locked

### Requirement: Matching runs have explicit lifecycle states
The system SHALL expose `queued`, `running`, `succeeded`, and `failed` states with timestamps, attempt count, and a monotonic transition history sufficient to distinguish waiting, active, completed, and unsuccessful work.

#### Scenario: Worker begins a queued run
- **WHEN** a worker claims a queued matching run
- **THEN** the run becomes `running`, records its start time and attempt, and remains associated with the originating event

#### Scenario: Run completes
- **WHEN** matching and group persistence finish successfully
- **THEN** the run becomes `succeeded`, records completion metadata, and the event and groups become visible atomically

#### Scenario: Run becomes stale
- **WHEN** a queued or running run exceeds its configured progress deadline without a valid heartbeat or terminal transition
- **THEN** the system exposes it as stalled, records a retryable failure classification, and does not present it as ordinary progress

### Requirement: Duplicate execution is idempotent
The system SHALL prevent duplicate commands, worker delivery, and retries from creating multiple active runs or more than one published group set for the same event lifecycle.

#### Scenario: Organizer repeats lock while a run is active
- **WHEN** the same event receives another lock command while its matching run is queued or running
- **THEN** the system returns the existing run and does not enqueue another independent run

#### Scenario: Worker redelivers a completed run
- **WHEN** a worker receives a run that already succeeded
- **THEN** it exits without recomputing or rewriting groups

#### Scenario: Retry follows transient failure
- **WHEN** a retryable worker failure occurs before the configured attempt limit
- **THEN** the same run records the failed attempt and retries without exposing partial groups

### Requirement: Matching publication is atomic
The system SHALL make pair scores, groups, group membership, matching metadata, event state, and successful run state visible as one committed result.

#### Scenario: Persistence fails after computation
- **WHEN** any matching output cannot be persisted
- **THEN** no partial group set is visible and the run remains eligible for the configured failure or retry transition

### Requirement: Matching status is queryable
Authorized organizer clients SHALL be able to retrieve the current matching run for an event using a validated response contract.

#### Scenario: Active run is queried
- **WHEN** an authorized organizer requests matching status for an event with a queued or running run
- **THEN** the response identifies the run, lifecycle state, timestamps, attempt count, and safe progress metadata

#### Scenario: Successful run is queried
- **WHEN** an authorized organizer requests status after matching succeeds
- **THEN** the response identifies the successful run and reports group and attendee counts without exposing attendee answers or scoring internals
