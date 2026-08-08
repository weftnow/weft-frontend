# Attendee Questionnaire Conversation — Design Specification

Date: 2026-08-07

Scope: Build only the attendee questionnaire at `/questionnaire`. Landing-page
changes, authentication, organizer tooling, dashboards, matching results, PWA
behavior, and other product surfaces are excluded.

## Goal

Create a production-quality, configuration-driven questionnaire that feels like
a live conversation between Weft and an event attendee. The supplied mobile
reference is the primary visual reference. The existing Weft landing page
provides the brand tokens: Comfortaa and Geist Mono typography, bone and paper
surfaces, ink text, the ember orange accent, the existing Weft mark, and quiet
premium motion.

The experience must remain focused on one active interaction while preserving
the full conversation above it. Every newly introduced Weft message types
progressively. Answer controls appear only after Weft finishes speaking.

## Approved Product Direction

The route uses a centered, mobile-first conversation column inside a full
dynamic viewport. It does not include a navbar or imitate a generic chatbot.
Weft messages are distinguished through the brand mark, typography, restrained
hairline containers, and whitespace. Attendee answers are right-aligned on a
soft ember-tinted surface.

Progress survives page refresh. Durable state is owned by the mock API layer
and stored in a versioned browser-storage record. UI components remain unaware
of the storage mechanism so a future HTTP API can serve both Next.js and React
Native without changing presentation contracts.

## Visual System

### Canvas and framing

The questionnaire fills `100dvh`/`100svh` as appropriate, with safe-area-aware
padding and a warm bone background. Mobile uses the full viewport rather than
rendering a decorative phone frame. Desktop centers the same intentionally
narrow experience and does not stretch the conversation across the screen.

The route has three persistent regions:

1. a minimal Weft identity header;
2. a scrollable conversation history;
3. a bottom interaction region whose content changes by question type.

The header contains the existing Weft mark and a compact mono questionnaire
label. The opening copy follows the reference hierarchy: a friendly display
heading and a quiet supporting line. There is no site navigation.

### Conversation styling

Weft messages use the logo as an author marker and a restrained outlined or
lightly surfaced text container. Containers size to content and avoid the
heavy, repeated bubble treatment associated with messaging products. Questions
are separated with generous vertical rhythm.

Attendee answers appear on the right with a soft ember wash and no typewriter
animation. Earlier messages remain legible but visually quiet so the current
question and composer command attention.

Selected controls use ember borders, warm surface tint, and clear radio or
checkbox indicators. Unselected controls use neutral hairlines and ink text.
Focus-visible styling uses a high-contrast outline consistent with the existing
Weft site.

### Motion

Motion is understated. It is used for message entrance, attendee-answer
entrance, composer replacement, option confirmation, Continue-button entrance,
completion, and small conversation-layout changes. Motion avoids bounce,
gamification, large travel distances, and aggressive springs.

When reduced motion is requested, Weft text renders immediately, smooth
scrolling becomes immediate, and nonessential transitions are removed.

## Conversation Flow

The opening Weft welcome types automatically. After a short natural pause, the
first real question types. No answer controls are displayed while Weft is
typing.

For each question:

1. append the new Weft question to conversation history;
2. enter `weft_typing`;
3. reveal the question progressively;
4. enter `awaiting_answer` when typing finishes;
5. transition the matching composer into the persistent interaction region;
6. accept and validate one answer while preventing duplicate submission;
7. enter `submitting_answer` and call the mock API;
8. append the attendee answer only after submission succeeds;
9. enter `transitioning`, hide the composer, and pause briefly;
10. begin the next Weft message or the completion sequence.

The completion sequence types two separate Weft messages:

- `You’re all set.`
- `Thanks. We’ll use your answers to introduce you to the right people.`

After the second message finishes, the phase becomes `completed` and the
durable session is marked complete.

## Typewriter Behavior

`TypewriterMessage` is reusable and owns only progressive text revelation. It
receives stable message identity, complete content, a flag indicating whether
the message is new, and an `onComplete` callback.

Characters render in order without altering punctuation or whitespace. The
base cadence is fast enough for conversational reading, with tiny deterministic
variation around punctuation and spaces. Long messages use a bounded cadence
so they do not create excessive waits. The component follows the growing
message at sensible intervals rather than snapping the scroll position on every
character.

Only the newly appended active Weft item animates. Persisted and previously
completed Weft items render in full. On refresh, the current unanswered question
also renders in full and resumes at `awaiting_answer`; old typing never replays.
Reduced-motion users always receive the complete message immediately.

## Composer Behavior

`QuestionComposer` is the persistent interaction boundary. It switches among
four focused composers with keyed Motion transitions and is mounted only while
the phase is `awaiting_answer`.

### Text

`TextComposer` renders a labelled text input and semantic send button. Enter
submits non-empty valid content; Shift+Enter is unnecessary because this is a
single-line answer. Submission trims the value. API failures preserve the
draft and return focus to the input.

### Single choice

`SingleChoiceComposer` renders accessible radio semantics. Choosing one option
visually confirms it, blocks additional input, waits briefly, and submits. It
does not render a disabled text input or a redundant Continue button.

### Multiple choice

`MultipleChoiceComposer` renders accessible checkbox semantics and enforces
minimum and maximum selection counts. A Continue button enters only after the
minimum is reached. Selection order is preserved for display and submission.

### Hybrid

`HybridComposer` renders predefined radio choices plus an `Other` choice.
Selecting Other reveals an inline text input and submit action. A predefined
choice follows the same short confirmation-and-submit behavior as a normal
single choice. Other text is trimmed and must be non-empty.

## Configuration and Schemas

The questionnaire is defined as data, never as component control flow. A Zod
discriminated union validates text, single-choice, multiple-choice, and hybrid
questions. Options have typed `id`, `label`, and `value` fields. Multiple-choice
schema refinement ensures valid minimum/maximum relationships and unique option
identifiers. Questionnaire records carry an `id` and version so incompatible
persisted sessions can be detected.

Submitted-answer schemas are discriminated by question type and validate answer
shape, requiredness, valid option membership, and selection limits against the
active question. Persisted conversation and session snapshots also have Zod
schemas so corrupted browser data cannot enter UI state.

The mock professional-networking questionnaire uses natural copy and includes:

- a single-choice question about what brought the attendee to the event;
- a hybrid question about who would be valuable to meet;
- a text question about current work;
- a multiple-choice question about relevant topics;
- a text or hybrid question about what the attendee can genuinely help with.

## State Model

Questionnaire definition and conversation history are separate. Conversation
items contain stable IDs, question IDs, author/type, content or answer value,
and completion metadata needed to prevent typewriter replay.

The conversational phase is one of:

- `weft_typing`
- `awaiting_answer`
- `submitting_answer`
- `transitioning`
- `completed`

Durable session state contains questionnaire ID/version, conversation history,
submitted answers, current question index, and completion status. Transient UI
state contains only the current phase, drafts, selected-but-unsubmitted options,
and timers. React-local state is sufficient; Zustand is not introduced.

## API and Query Architecture

The feature exposes a transport-neutral mock API:

- `getQuestionnaire()` returns validated questionnaire configuration and the
  validated resumable session snapshot;
- `submitAnswer()` validates the active question and answer, persists the
  updated session, and returns the canonical snapshot;
- `completeQuestionnaire()` persists and returns the completed snapshot.

TanStack Query wraps the read and both mutations. The Query client is provided
at the narrowest practical app boundary. Mutations update or invalidate the
questionnaire-session query using canonical API results. Components do not
read or write `localStorage` directly.

The current adapter stores one versioned record in browser storage. Missing
storage produces a new session. Invalid, corrupted, or version-incompatible
storage is discarded safely and replaced. The adapter must tolerate storage
being unavailable without breaking the questionnaire during the active visit.

## Component Boundaries

- `Questionnaire` owns conversational orchestration and transient phase state.
- `Conversation` owns the scroll viewport and active-message visibility.
- `ConversationItem` renders either the Weft or attendee presentation.
- `TypewriterMessage` reveals one newly introduced Weft message.
- `QuestionComposer` selects the correct composer from question configuration.
- Each composer owns only its draft/selection UI and emits a typed answer.
- `useQuestionnaire` binds the mock API to TanStack Query and exposes canonical
  loading, mutation, resume, and completion state.
- schemas, types, data, and API behavior remain in their named feature folders.

The App Router page remains a small server component that exports route metadata
and renders the interactive feature client boundary.

## Auto-scroll and Focus

The conversation viewport uses an end sentinel plus measured, throttled follow
behavior. A new question, an interval of typewriter growth, attendee answer
entrance, and composer entrance can request visibility. The logic scrolls only
when the attendee is already near the conversation end, so manual review of
older messages is not interrupted.

When a composer becomes available, focus moves to its first meaningful control.
Focus never moves while Weft is still typing. After an API error, focus returns
to the preserved composer. Radio and checkbox options support keyboard focus,
Space activation, visible focus treatment, semantic grouping, and descriptive
labels.

## Persistence and Resume

Refresh restores the canonical session:

- completed conversation items render immediately;
- submitted answers remain visible;
- an unanswered current question renders completely without typing again;
- its composer is immediately available after hydration;
- completed sessions restore the two final Weft messages and completed state.

Partially selected but unsubmitted multiple-choice values and unsent text drafts
are transient and do not survive refresh. Only API-accepted answers are durable.

## Error Handling

Loading uses a small Weft-branded quiet state rather than rendering incomplete
controls. Configuration errors produce a contained error message with a retry
action. Submission errors keep the composer and draft intact, show concise
inline feedback, and do not append an attendee answer or advance the index.

All mutation phases disable duplicate submission. Timers are cleared on unmount
or question change. Unknown persisted option IDs, incomplete answer records,
and mismatched questionnaire versions trigger safe session reset rather than a
partially valid resume.

## Accessibility

The route uses semantic landmarks and an `aria-live="polite"` conversation
region without announcing every typewriter character. The complete Weft message
is announced once when ready. Controls have accessible names, fieldsets and
legends or equivalent group labels, radio/checkbox semantics, visible focus
states, minimum comfortable touch sizes, and sufficient contrast.

The keyboard can complete the entire questionnaire. Reduced-motion preference
skips typewriter and nonessential motion. Decorative logo repetitions and
ambient visual elements are hidden from assistive technology.

## Testing and Verification

Implementation follows test-driven development. Tests cover:

- all questionnaire and submitted-answer schema branches;
- invalid option IDs and multiple-choice selection limits;
- mock API creation, submission, completion, corruption recovery, and resume;
- phase transitions and duplicate-submission guards;
- old-message non-replay and reduced-motion typewriter completion;
- composer rendering by discriminant and keyboard submission;
- accessible option state and completion copy;
- architecture expectations for the new feature-based file structure.

Final verification includes the targeted tests, complete Bun test suite, ESLint,
strict TypeScript through the production Next.js build, and `git diff --check`.
Browser QA covers representative phone, small-laptop, and desktop viewports;
keyboard completion; reduced motion; natural scroll following; all four composer
types; mock API error recovery where practical; and refresh resume before and
after completion.

## Out of Scope

- Landing-page changes or a site navbar.
- Authentication, attendee accounts, or cross-device persistence.
- Organizer tools, dashboards, analytics, or questionnaire builders.
- Matching logic, results, introductions, or result screens.
- PWA or offline-install behavior.
- A production backend, Server Actions as an API abstraction, or a database.
- React Native implementation.
- Chat UI libraries, Redux, or unnecessary global state.

