# Branded Group Error States — Design Specification

**Date:** 2026-08-13  
**Status:** Approved  
**Scope:** Questionnaire group-reveal failure states

## Context

After an attendee finishes the questionnaire, the frontend replaces the route
with the group-reveal page and begins polling the group endpoint. The endpoint
already distinguishes a missing attendee session (`401`, `no_session`) from a
temporary backend failure (`503`, `unavailable`), but the client discards that
code and reduces every failure to one boolean. The resulting UI is two plain
elements in a feature-local shell: “Group details are unavailable” and an
outlined retry button. It has the warm background color but bypasses the Weft
mark, questionnaire texture, centered state composition, typographic
hierarchy, explanatory copy, and localized recovery guidance.

## Approved Direction

Render both expected group failures as first-class questionnaire states using
the same visual language as questionnaire loading, completion, and notice
screens. Preserve the existing warm bone surface, ambient color, texture,
Comfortaa typography, ink text, ember accents, and focus treatment. Reuse the
Weft icon and the shared `questionnaire-shell questionnaire-state` composition
rather than creating a card or a second error design system.

The two states are intentionally distinct:

1. **Missing session** — explain that Weft cannot find the attendee's saved
   session on this device. The primary recovery action takes the attendee back
   to the questionnaire link so they can re-enter or resubmit if appropriate.
2. **Temporary unavailability** — explain that Weft could not load the group
   right now and that the attendee's submitted answers are not implicated.
   The primary recovery action retries the group request in place.

Both states support English and Spanish. Copy must describe what the product
actually knows without claiming that a group does not exist: a `204` response
still means “keep waiting,” while only `no_session` indicates that the saved
attendee session cannot be resolved.

## Component and Data Design

The group-reveal client reads the existing JSON error response and converts it
to a small typed error kind: `no_session` or `unavailable`. Unknown, malformed,
timed-out, and network failures safely collapse to `unavailable`.

`useGroupReveal` stores the typed error kind instead of a boolean. Successful
waiting or ready responses clear it. The current polling cadence, visibility
handling, backoff, countdown, confirmation, and reveal behavior remain
unchanged.

The presentation layer renders a focused branded error component containing:

- the decorative Weft mark;
- a short questionnaire/group eyebrow;
- a clear heading for the specific failure;
- one concise explanatory paragraph;
- one recovery action with the established questionnaire button language.

The unavailable action calls the existing retry function. The missing-session
action navigates to the same form-token questionnaire route. No group token,
attendee credential, backend detail, or raw status code appears in the UI.

## Error and Timing Semantics

The UI does not invent a “group not found” state. Before matching or reveal,
the backend contract returns `204`, and the frontend continues showing the
branded waiting state. A missing-session message is reserved for `401` with
`no_session`. Backend outages, configuration problems, timeouts, unexpected
responses, and schema failures use temporary-unavailability copy.

This change does not alter timeout values or polling behavior. The observed
local failure was caused by `WEFT_B2B_API_URL` pointing to `localhost:8000`
while no backend process was listening there. In slower failure modes, the
browser request and server-side upstream calls can consume their timeout
budgets before the error state appears; polling then backs off after repeated
failures.

## Accessibility and Responsive Behavior

The heading is the primary page landmark content and the explanatory message
is readable at a narrow measure. The failure announcement uses an alert or
status semantic without repeatedly announcing subsequent polls. Actions are
at least 44 pixels high and retain a visible keyboard focus ring. Decorative
branding is hidden from assistive technology. The centered composition must
work at phone and desktop widths without overflow, and reduced-motion behavior
continues to come from the questionnaire shell.

## Testing and Verification

Implementation follows test-driven development:

1. Add presentation tests that fail until both typed failures render the
   branded questionnaire composition, specific localized copy, and correct
   recovery action.
2. Add client tests that fail until `401 no_session`, `503 unavailable`, and
   malformed/network failures map to their intended typed errors.
3. Add or update hook coverage proving that a successful poll clears an error
   and that failures preserve their kind.

Verification includes the focused Bun tests, the full Bun suite, ESLint, the
production Next.js build, `git diff --check`, and browser QA on the supplied
group URL at desktop and phone widths with the local backend unavailable.

## Acceptance Criteria

- The error screen visibly belongs to the Weft questionnaire experience.
- Missing attendee sessions and temporary service failures have different,
  accurate localized messages.
- Temporary failures offer an in-place retry.
- Missing sessions offer a route back to the questionnaire.
- Waiting, countdown, reveal, confirmation, and conversation navigation
  behavior remain unchanged.
- No private credential or backend detail is exposed.
- The page remains accessible and responsive.

## Out of Scope

- Changing the backend group contract or matching behavior.
- Changing polling cadence, retry backoff, or timeout budgets.
- Adding telemetry, a new illustration, a card treatment, or dependencies.
- Redesigning the revealed group, countdown, or conversation screens.
