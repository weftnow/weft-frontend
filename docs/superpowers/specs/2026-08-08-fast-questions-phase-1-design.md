# Weft Phase 1: Fast Questions — Design Specification

Date: 2026-08-08

Scope: Add only Phase 1 of the guided in-person conversation experience to the
existing `weft-web` application. The landing page and attendee questionnaire
remain unchanged. Phase 2 and Phase 3 are not implemented.

## Goal

Build the mobile-first Fast Questions experience at
`/e/[eventId]/conversation`, using the supplied phone design as the primary
visual reference. Every attendee phone displays the same backend-authoritative
round, question, active participant, and deadline while the interface remains
calm, social, minimal, and recognizably Weft.

## Approved Product Rules

- Phase 1 always contains exactly three rounds.
- Every participant answers once per round.
- Each round restarts from participant index zero.
- The backend supplies each question's duration; the initial mock durations
  are 30, 45, and 60 seconds.
- There is no captain role. Starting and participating must not depend on a
  privileged group member.
- Phase 2 does not start when Round 3 ends. The session reaches a distinct
  Phase 1 completion boundary and remains there until a future explicit action.
- New frontend and API code uses participant terminology consistently:
  `participants`, `currentParticipant`, `participantIndex`, and
  `participantDurationSeconds`.
- The frontend does not infer a duration from the round index.
- The event ID is present in the attendee route.

## Route and Journey

The new route is `/e/[eventId]/conversation`. It belongs to the existing
attendee journey and renders no website navbar or footer. The route retains the
same narrow, phone-derived composition on desktop rather than becoming a
dashboard.

The route segment validates `eventId` before rendering the interactive feature.
The current questionnaire and result routes are not changed in this slice.
Future journey wiring may navigate from the group result into this route once
the upstream backend flow exposes the event ID.

## Architecture

The UI consumes one validated `FastQuestionsSession`; it does not independently
decide the domain position. TanStack Query loads and polls that session through
a transport-neutral conversation client. The production client calls
same-origin Next.js Route Handlers, which use the event ID and the existing
HttpOnly attendee credential to reach the backend. The credential is never
exposed to browser JavaScript.

The feature has three boundaries:

1. **Wire boundary:** Zod validates upstream and same-origin responses.
2. **Domain boundary:** the API adapter returns a normalized
   `FastQuestionsSession` using participant terminology.
3. **Presentation boundary:** React components render the session and own only
   short visual transition state and the timestamp-derived countdown display.

The mock API implements the same interface as the HTTP client. It is injected
in tests and available for local development while the backend contract is
being simplified. Production behavior must not silently fall back to mock
state when the upstream service is misconfigured.

TanStack Query is added as the only new runtime dependency because it is named
in the requested stack but is not currently present in `package.json`. Its
provider is mounted at the narrow conversation feature boundary rather than at
the application root.

## Session Contract

The normalized domain model is configuration-driven and validated by Zod.
Conceptually:

```ts
type Participant = {
  id: string
  firstName: string
  avatarUrl: string
  isCurrentUser: boolean
}

type FastQuestionRound = {
  id: string
  question: string
  participantDurationSeconds: number
}

type FastQuestionsSessionStatus =
  | "waiting"
  | "active"
  | "phase_complete"

type FastQuestionsSession = {
  eventId: string
  phaseId: "phase_1"
  type: "fast_questions"
  status: FastQuestionsSessionStatus
  roundIndex: number
  participantIndex: number
  timerStartedAt: string | null
  timerEndsAt: string | null
  participants: Participant[]
  rounds: FastQuestionRound[]
}
```

The schema enforces exactly three rounds, positive durations, three to six
participants for the current UI, unique IDs, one current user, valid indices,
and valid ISO timestamps. The presentation derives the active round and
participant from the validated indices. Names and questions are never embedded
inside UI components.

The initial mock rounds use:

1. “What’s one thing you’re working on right now?” — 30 seconds.
2. “What’s something you’re trying to figure out right now?” — 45 seconds.
3. “What’s one thing someone in this group might be able to help you with?” —
   60 seconds.

These values demonstrate the contract; the backend response remains the source
of truth.

## API Boundary

The feature exposes an interface with operations corresponding to product
intent rather than transport details:

```ts
type FastQuestionsApi = {
  getConversationSession(eventId: string): Promise<FastQuestionsSession>
  startFastQuestionsPhase(eventId: string): Promise<FastQuestionsSession>
  advanceParticipantTurn(
    eventId: string,
    expected: { roundIndex: number; participantIndex: number },
  ): Promise<FastQuestionsSession>
}
```

Every successful operation returns the complete canonical session. Expected
round and participant indices make an early-finish action safe against stale
or duplicate taps. Normal timer expiry is handled by the backend and observed
through polling; clients do not independently call an advance-round operation.

The client uses a stable event-scoped query key and modest polling while the
session is active. Polling stops at `phase_complete`. The local timer updates
the display between polls from `timerEndsAt`, and each canonical response
corrects any client drift. Query retries are limited and use quiet Weft-branded
loading and error states.

## State and Transitions

Domain position belongs to the session. Presentation uses an explicit visual
state rather than scattered booleans:

```ts
type FastQuestionsViewState =
  | "round_intro"
  | "participant_active"
  | "participant_transition"
  | "round_transition"
  | "phase_complete"
```

The controller may briefly enter a visual transition when a canonical session
changes, but it never increments participant or round indices itself.

- Initial active session: introduce the round and question, then show the
  active participant.
- Participant change: briefly soften the old participant treatment, activate
  the new participant, and reset the timer presentation from the new canonical
  timestamps.
- Round change: pause, update the round indicator and question, reset visual
  participant progress to index zero, then display the active state.
- Final participant of Round 3: transition to `phase_complete` and stop polling.

All visual pauses are short and cancellable. If a newer session arrives during
a transition, the newest canonical state wins. Timers and transition callbacks
are cleared on unmount and identity changes.

## Countdown Design

`CircularTimer` is a reusable SVG component receiving duration, remaining
time, and running state. It renders a thin neutral track and ember progress
stroke with rounded ends. The ring decreases toward zero and transitions
linearly between timestamp-derived updates.

`useCountdown` receives `timerEndsAt` and the configured participant duration.
It calculates remaining time from `Date.now()` rather than decrementing stored
seconds. The visible `MM:SS` value changes once per second. Returning from a
backgrounded browser immediately recalculates from the absolute deadline, so
missed intervals do not extend a turn.

The time text is available to assistive technology but is not an `aria-live`
region. Only meaningful participant and round changes are announced.

## Visual Direction

The attached design is the primary visual reference. The implementation reuses
the existing Comfortaa display font, Geist Mono details, `/icon.svg`, bone
background, ink text, ember accent, and existing portrait assets.

The composition is a centered mobile column with:

- the Weft mark;
- a compact mono “PHASE 1 · FAST QUESTIONS” indicator;
- “Round N of 3” in ember;
- a large centered question as the strongest element;
- the active participant label and quiet ember activity dot;
- a large thin circular timer;
- a horizontal participant row with names;
- the two-line guidance message;
- a hairline divider and three-part round progress footer.

Sections are separated through whitespace and alignment, not nested cards.
The background may use an extremely subtle warm ambient wash, but there are no
generic gradients, glass panels, dashboard framing, game effects, or dramatic
motion.

## Participant Presentation

`ParticipantList` supports approximately three to six participants without
assuming five. Responsive CSS variables reduce avatar and gap sizes before
allowing overflow. Long names truncate visually while their full accessible
name remains available.

`ParticipantAvatar` renders a real image with a neutral hairline. The active
participant receives an ember outline, ember name, and small ember activity
dot. Motion uses a restrained opacity/color/scale transition with no bounce.
Only one participant may be active.

Mock participants use realistic existing portrait assets. The adapter preserves
backend-provided avatar URLs when available and applies stable local mock
fallbacks only in the mock environment.

## Responsive Layout

The experience fills at least `100svh` and uses `100dvh` when supported, with
safe-area-aware top and bottom padding. A standard phone should see the primary
question, timer, participants, guidance, and progress without unnecessary
scrolling.

Height-constrained layouts reduce vertical gaps first, then avatar size, then
timer diameter. The main question keeps a readable minimum size. Extremely
short screens may scroll as a graceful fallback. Desktop centers the same
mobile-derived composition within a restrained maximum width.

## Phase Completion

At `phase_complete`, the active session composition transitions to a simple
Weft completion state:

- “Fast questions complete.”
- “Nice. Now that everyone’s had a chance to speak, let’s go a little deeper.”
- a temporary Continue button implemented through an explicit callback seam.

The button does not start, fetch, render, or navigate to Phase 2 in this slice.
The completion state remains stable after refresh because it comes from the
canonical session.

## Accessibility

- The route uses a semantic `main` landmark and meaningful heading order.
- Active-participant changes are announced through one polite live region.
- The countdown is readable but not announced every second.
- Participant status is communicated in text and semantics, not color alone.
- Images have meaningful participant alt text; decorative marks are hidden.
- Focus-visible treatment uses the existing high-contrast signal outline.
- The Continue action is keyboard accessible.
- Reduced motion removes nonessential transitions while preserving state and
  timing accuracy.

## Error and Loading Behavior

Invalid event IDs render a contained invalid-link state without an upstream
request. A missing attendee credential, unavailable session, or upstream error
renders quiet Weft-branded guidance and a retry action where recovery is
possible. The active canonical session remains visible during background
refetch failures; transient network problems do not reset the timer or
participant progress.

Malformed responses fail Zod validation at the API boundary and never reach
presentation components. Duplicate start or advance responses replace the
query cache with the returned canonical session rather than applying local
optimistic arithmetic.

## Component and File Boundaries

The feature follows the existing `src/features` organization:

- `components/FastQuestions.tsx` — thin feature shell and view-state selection.
- `components/QuestionDisplay.tsx` — keyed question presentation.
- `components/CircularTimer.tsx` — reusable SVG timer.
- `components/ParticipantList.tsx` — responsive group layout.
- `components/ParticipantAvatar.tsx` — one participant and active treatment.
- `components/RoundProgress.tsx` — three indicators and “N of 3”.
- `components/FastQuestionsCompletion.tsx` — Phase 1 completion only.
- `hooks/useFastQuestions.ts` — TanStack Query binding and presentation
  transitions.
- `hooks/useCountdown.ts` — timestamp-derived display clock.
- `schemas/fastQuestions.schema.ts` — wire/domain validation.
- `types/fastQuestions.types.ts` — schema-inferred public types.
- `api/fastQuestions.api.ts` — transport-neutral interface and HTTP client.
- `data/mockFastQuestions.ts` — validated development fixture.

The App Router page remains a small server component. Same-origin Route
Handlers remain thin validation/proxy boundaries. Files may be combined when
the existing code style makes a separate file trivial, but domain, transport,
timing, and presentation responsibilities remain distinct.

## Testing and Verification

Implementation follows strict test-driven development. Tests cover:

- Zod rejection of invalid round counts, durations, timestamps, indices,
  duplicate IDs, and current-user cardinality;
- the 30/45/60 mock configuration;
- every participant receiving one turn in each of exactly three rounds;
- participant index zero beginning every round;
- Phase 1 stopping at completion without Phase 2 activity;
- timestamp-derived countdown behavior, browser background catch-up, deadline
  clamping, timer replacement, and unmount cleanup;
- stale and duplicate advance responses resolving to canonical state;
- question, participant, timer, and progress rendering;
- three- and six-participant responsive variants and long names;
- meaningful live announcements without per-second timer announcements;
- reduced-motion behavior;
- invalid route and recoverable API states;
- the completion copy and inert Phase 2 boundary.

Final verification runs the focused tests, complete Bun test suite, ESLint,
production Next.js build, and `git diff --check`. Browser QA covers a small
phone, a reference-sized phone, a small laptop, and desktop; it also checks
keyboard access, reduced motion, background/resume timing, participant changes,
all three round transitions, and Phase 1 completion.

## Out of Scope

- Phase 2 or Phase 3 UI, routing, content, or state.
- Changes to the landing page or attendee questionnaire.
- Website navigation or footer on the conversation route.
- WebSockets, server-sent events, or a new real-time service.
- Organizer controls, analytics, or group-management tools.
- Backend implementation changes in this frontend repository.
- Redux or another global state library.
- Production avatar upload or profile editing.
