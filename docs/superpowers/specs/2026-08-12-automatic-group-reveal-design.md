# Automatic Group Reveal — Design Specification

**Date:** 2026-08-12  
**Status:** Approved  
**Frontend:** `weft-web` (Next.js 16.2.11)  
**Backend:** `weft-b2b-backend` (FastAPI)

## Goal

Continue the attendee journey after the conversational questionnaire with a
production group-waiting and reveal experience. Once matching finishes, the
backend automatically arms the existing shared countdown. The attendee then
sees the people in their group, confirms that they found them, and can enter the
existing guided-conversation flow.

The result screen follows the supplied mobile reference while using only data
the questionnaire actually collects: name, company, selected work function,
and the attendee's answer to what they want to accomplish. Photos are replaced
with deterministic initials avatars.

Manual host reveal remains implemented and idempotent. A backend feature flag
makes automatic reveal the default behavior for this release and allows the
existing host-triggered behavior to be restored without reverting code.

## Approved Product Decisions

- Successful questionnaire submission automatically continues to the
  event-scoped group route; the old terminal thank-you screen is no longer the
  normal end of the submitted flow.
- The attendee first sees a calm waiting screen while their event has no
  published group.
- Matching completion automatically arms the existing five-second shared
  countdown. No host action is required when automatic reveal is enabled.
- The countdown uses backend `reveal_at` and `server_time`, so phones converge
  despite local clock drift.
- The group result shows each tablemate's name, company, localized role, and a
  short profile line derived from `t1`.
- Avatars use name initials. The feature does not invent, upload, or persist
  photos.
- The first result CTA is `I found my group`. It uses the existing idempotent
  confirmation endpoint.
- After confirmation, the CTA becomes `Start guided conversations` and opens
  the existing backend-driven icebreaker for the attendee's group.
- Existing host reveal logic remains available. Automatic reveal is controlled
  by `AUTO_REVEAL_GROUPS`, which defaults to `true` for this release. Setting it
  to `false` restores the current manual host-reveal lifecycle.
- No matching formula, group composition, or attendee-token security model is
  changed.

## Experience and Visual Direction

This is a mobile-first live-event product surface for people using a phone in a
busy room. It uses Weft's warm bone background, ink typography, ember accent,
Comfortaa display face, Geist Mono utility labels, generous spacing, and
restrained motion. The design dials are variance 5, motion 4, and density 5:
distinctive enough to feel like a reveal, but highly scannable.

Mobile fills the viewport and respects safe-area insets. Desktop centers the
same narrow product surface without a decorative device frame. The persistent
bottom action remains reachable without obscuring the last group member.

### Waiting

After submission, the browser navigates to
`/questionnaire/{formToken}/group`. The waiting state shows the Weft mark, event
context, a calm progress treatment, and copy explaining that Weft is preparing
the group. It does not estimate a completion time or imply that the attendee
must ask the host to reveal anything.

The browser polls a same-origin endpoint. `204 No Content` means there is no
revealed group yet and keeps this state intact.

### Countdown

The first valid group response may carry a future `reveal_at`. The client
computes clock offset from `server_time`, counts down from the shared deadline,
and renders a focused 3–2–1 transition. The backend currently arms five seconds;
the UI displays the remaining whole seconds and does not assume a fixed
duration. A late attendee whose deadline is already in the past skips the
countdown.

Reduced-motion preference removes scale and travel but preserves the readable
number changes and timing. The group payload must not be rendered visually or
exposed to assistive technology before the deadline.

### Group result

The result hierarchy is:

1. Weft identity;
2. compact `MATCH COMPLETE · {n} CONNECTIONS` status;
3. `Your circle is ready.` heading and concise supporting line;
4. table identifier using the backend group index and group color;
5. one connected row per tablemate;
6. sticky primary action.

Each row contains:

- an initials avatar derived from the first and last meaningful name parts;
- the full display name;
- localized role and optional company, separated by a centered dot only when
  both exist;
- a visually clamped profile sentence derived from `t1`.

One-word names produce one initial. Blank or non-letter names fall back to
`?`. Avatar surface colors are deterministic from the display name and remain
decorative; they do not replace or conflict with the authoritative group color.
The woven connector is decorative and hidden from assistive technology.

Profile text is stored and transported in full within the existing backend
field limit, but the card clamps it to two lines. The accessible name retains
the full string. The frontend does not summarize or rewrite attendee text.

### Confirmation and guided conversation

Before confirmation, the sticky action says `I found my group`. While the
request is pending it disables duplicate activation without replacing the
result screen. A successful or already-completed confirmation changes the
action to `Start guided conversations`.

The second action navigates to
`/questionnaire/{formToken}/conversation`, which renders the existing guided
conversation experience against form-token-scoped proxy routes. It enters the
existing attendee icebreaker state for the same credential and group. It does
not create a second session or use organizer credentials. If the icebreaker is
not ready (`204`), the existing conversation waiting state handles it.

## Backend Design

### Automatic reveal lifecycle

Add `auto_reveal_groups: bool = True` to backend settings and document
`AUTO_REVEAL_GROUPS=true` in `.env.example`.

On a successful first partition, `run_partition` continues to create groups,
members, and icebreaker sessions in one transaction. It then transitions the
event from `locked` to `published`. When automatic reveal is enabled, it calls
the existing `events_service.reveal` in the same unit of work. That service is
the single owner of countdown timing and transitions the event from `published`
to `live` while assigning `reveal_at` once.

When the flag is disabled, `reveal_at` remains null and the event remains
`published`, exactly matching the current manual flow. The existing
`POST /v1/events/{event_id}/reveal` endpoint is unchanged and remains safe to
call after an automatic reveal because the service is idempotent.

Partition failures reopen the event and never arm a countdown. Retried or
duplicate partition jobs cannot move an already-published/live deadline because
the runner's existing state guard returns before rebuilding groups.

### Enriched attendee reveal contract

Extend `TablemateOut` returned by `GET /a/{attendee_token}`:

```json
{
  "display_name": "Maya Chen",
  "company": "Northline Labs",
  "role": "Engineering · Product",
  "profile": "Build healthier rituals for distributed teams."
}
```

The existing top-level fields remain unchanged:

- `group_index`
- `colour`
- `confirmed`
- `reveal_at`
- `server_time`
- `tablemates`

`company` is `string | null`; empty or whitespace-only submissions normalize to
null for this response. `role` and `profile` are non-empty strings because
`s1_function` and `t1` are required by the canonical form.

The publishing service joins each tablemate to the latest stored `Response`
record. It reads `company`, `s1_function`, and `t1` from `Response.raw` rather
than duplicating them into attendee columns. There is no database migration.
The requesting attendee's stored response language selects the public label for
every tablemate's `s1_function`, preventing a mixed-language result. Unknown
legacy function values fall back to a stable humanized value rather than
failing the whole group response.

The endpoint continues returning `204` until `reveal_at` exists. It never emits
profiles, IDs, match scores, pair breakdowns, contact details, or embeddings
before or after reveal. Tablemates continue excluding the requesting attendee.

## Frontend Architecture

The frontend preserves its server-only Backend-for-Frontend boundary:

```text
Questionnaire submit
    |
    | backend attendee Set-Cookie forwarded as HttpOnly
    v
/questionnaire/{formToken}/group
    |
    | browser polls same-origin route
    v
/api/questionnaire/{formToken}/group
    |
    | forwards request cookies to FastAPI /f/{formToken}/resume
    | validates the private redirect and extracts attendee token server-side
    | calls FastAPI /a/{attendeeToken}
    v
204 waiting OR validated group JSON
```

The attendee token never appears in browser JSON, route parameters,
localStorage, client logs, or rendered HTML. The server gateway resolves it by
forwarding the event-scoped HttpOnly cookie to the backend's existing resume
endpoint with redirects disabled, accepting only a same-backend relative
`/a/{token}` location. It matches that returned token to the existing
`weft_attendee_{eventUuidHex}` cookie to recover the real event UUID for the
existing conversation/feedback contract. Both values remain server-side while
the gateway calls attendee endpoints.

The same resolver supports confirmation and attendee icebreaker proxy routes
under `/api/questionnaire/{formToken}/conversation`. Those routes mirror the
existing get/start/done/continue/challenge-next operations. The current guided
conversation presentation, schemas, and state machine are reused; its transport
is parameterized so the existing event-ID entry and the new form-token entry
can select their own same-origin API base without duplicating the experience.
The resolver is a focused server-only unit with strict token/location parsing,
upstream timeouts, `cache: "no-store"`, and redacted error logs.
Browser-facing group, confirm, and icebreaker responses never include the
credential.

### Feature boundaries

- The App Router group page validates `formToken`, exports private metadata,
  and renders the client feature boundary.
- A group contract schema validates the enriched FastAPI payload and ISO
  timestamps.
- A server gateway owns resume resolution, backend calls, timeouts, and error
  mapping.
- same-origin Route Handlers own request validation and browser-safe responses.
- a client API owns polling and confirmation requests.
- a group controller owns `waiting`, `countdown`, `revealed`, `confirming`,
  `confirmed`, and recoverable-error transitions.
- presentation components own the waiting, countdown, initials avatar, member
  list, and sticky action visuals and know nothing about tokens or backend URLs.
- the existing guided-conversation feature accepts an injected same-origin API
  base, allowing the new form-token route to reuse it without knowing the
  attendee token or backend address.

The existing questionnaire controller marks the draft completed as it does
today, then navigates to the group route only after the same-origin submission
succeeds. Restoring an already-completed local draft also navigates to the
group route, allowing a refresh or return visit to resume waiting/results from
the HttpOnly cookie.

## Polling and Timing

Polling starts immediately on the group route. While the latest response is
`204`, use a modest bounded schedule: 2 seconds for the first 30 seconds, then
5 seconds. Polling pauses while `document.visibilityState` is hidden, resumes
immediately on visibility, and permits a manual Retry after recoverable errors.
Only one request may be active at a time.

Once a valid group payload arrives, polling stops. The clock offset is
`server_time - client_receive_time`; countdown remaining time is calculated
against `reveal_at` using that offset. This favors a small late reveal over
showing private group data early. When the deadline passes, the controller
reveals the already-validated payload without another network request.

## Error Handling

- Missing, expired, cross-event, or tampered attendee cookies produce an
  attendee-session notice with a link back to the supplied event questionnaire.
- A backend `204` is normal waiting state, not an error.
- Timeouts and `5xx` responses preserve the last stable state and show a Retry
  action. Polling does not spin aggressively after failure.
- Invalid upstream JSON is rejected at the gateway and mapped to a generic
  unavailable response; raw validation detail is not exposed to attendees.
- Confirmation failure keeps the unconfirmed CTA and permits retry. A repeated
  confirmation remains successful because the backend operation is idempotent.
- A result with no tablemates still renders the table identity and an honest
  empty-group notice instead of crashing.
- The profile UI treats absent company as expected optional data.
- Partition failures do not reveal partial groups. The attendee remains in the
  waiting state until a later successful matching run.

## Accessibility

The waiting state uses a polite status region without announcing every poll.
The countdown announces each displayed whole number once. The result heading
receives focus after reveal, and the member list uses semantic list markup.
Decorative avatars and connector lines are hidden from assistive technology;
each visible initials avatar accompanies the person's actual heading rather
than substituting for it.

All actions have visible focus treatment, at least 44px touch targets, pending
labels, and disabled semantics. Color is never the sole representation of the
table: group index/text always accompanies it. Reduced motion removes
nonessential transitions while preserving state changes and countdown meaning.

## Testing Strategy

Implementation follows test-driven development in both repositories.

### Backend

- settings tests prove automatic reveal defaults on and can be disabled;
- matching-runner tests first fail against the old null `reveal_at`, then prove
  successful matching publishes, arms one shared countdown, and enters `live`;
- manual-mode tests prove the flag preserves `published` plus null `reveal_at`;
- repeat-job and manual-reveal tests prove the deadline never moves;
- failure tests prove no countdown is armed for an invalid partition;
- publishing tests prove tablemate name, optional company, localized function
  label, and exact `t1` profile mapping from stored responses;
- contract tests cover missing company and unknown legacy function values;
- privacy tests prove the response excludes IDs, contact fields, scores,
  embeddings, and the requesting attendee;
- lifecycle tests cover submission through auto-reveal, confirmation, and the
  existing icebreaker session.

### Frontend

- schemas accept the enriched contract and reject missing/invalid fields or
  malformed timestamps;
- gateway tests cover cookie forwarding, safe resume redirect parsing, token
  non-disclosure, `204`, backend errors, timeouts, and invalid bodies;
- Route Handler tests cover validation, `no-store`, safe error mapping,
  confirmation, and attendee icebreaker proxying;
- guided-conversation regression tests prove its existing event-ID transport
  still works while the form-token transport targets the new proxy routes;
- controller tests cover waiting polling, bounded backoff, hidden-tab pause,
  shared-clock countdown, late arrival, reveal, confirmation, and retries;
- pure initials tests cover multi-part, one-word, whitespace, Unicode, and
  unusable names;
- presentation tests cover optional company punctuation, full accessible
  profile text, empty tablemates, semantic lists, focus movement, and reduced
  motion;
- questionnaire interaction tests prove successful submission and completed
  draft restoration continue to the group route;
- an integration test walks submission cookie → waiting `204` → automatic
  matching/reveal → countdown → enriched result → confirmation → icebreaker.

## Verification

Backend verification includes focused tests, the full non-live pytest suite,
Ruff, and migration-head validation even though this feature adds no migration.
Frontend verification includes focused Bun tests, the full Bun suite, ESLint,
the production Next.js build, and `git diff --check`.

Browser QA covers a representative phone, small laptop, and desktop; English
and Spanish questionnaires; missing company; long and Unicode names; reduced
motion; keyboard-only interaction; tab hide/resume; network interruption;
late attendee; confirmation retry; and the handoff to guided conversation.

## Acceptance Criteria

- Completing a real event questionnaire continues to a calm group waiting
  screen without exposing an attendee token to JavaScript.
- With `AUTO_REVEAL_GROUPS=true`, a successful partition automatically arms the
  existing five-second countdown and requires no host action.
- With the flag disabled, the existing manual host reveal behavior is
  preserved.
- Multiple attendees use the same backend deadline and never see group content
  before it.
- The result lists every tablemate with name, localized role, optional company,
  exact `t1` profile text, and deterministic initials avatar.
- The result leaks no attendee IDs, contact information, scores, breakdowns,
  embeddings, or attendee credential.
- `I found my group` records confirmation exactly once from the attendee's
  perspective and survives retries/double taps.
- Confirmed attendees can open the existing guided conversation for their
  group with the same secure session.
- Waiting, countdown, results, errors, and actions are accessible and usable at
  phone and desktop sizes.
- Both repositories pass their full non-live verification suites and the
  cross-service lifecycle smoke test.

## Out of Scope

- Removing the host reveal endpoint or manual lifecycle.
- Changing matching scores, partition assembly, group size, or latecomer
  placement.
- Collecting, generating, or uploading profile photos.
- New profile-editing fields or a standalone attendee directory.
- Exposing email, phone, social links, attendee IDs, or matching explanations.
- Cross-device attendee recovery or account authentication.
- Rebuilding the guided-conversation protocol already present in both systems.
- Organizer UI for changing the automatic-reveal flag; it is deployment
  configuration for this release.
