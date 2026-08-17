# Edit Event On Its Own Screen — Design Specification

**Date:** 2026-08-17
**Status:** Approved
**Scope:** `weft-web` organizer event dashboard — the edit affordance and its destination

## Context

Editing an event is currently revealed inline. `EventDetailsCard` holds an "Edit
event" button that swaps that one card's contents for the whole
`CreateEventForm`, while the rest of the Overview tab — the share band, the
count cards, the readiness list, the intent charts — stays on screen around it.
Saving calls `window.location.reload()`.

`CreateEventForm` is a two-pane screen: a main pane carrying the name, the two
datetime fields, the location and the description, and a settings rail carrying
table size and capacity. A single card inside a multi-column grid cannot hold
that at a sensible width.

The create flow already reached this conclusion and acted on it.
`new/page.tsx` records that the form used to be revealed inline behind a fold-out
and that this stopped being right once the form grew its second pane, so creating
an event moved to its own screen. `EventDetailsCard` still justifies staying
inline by pointing at that same fold-out, which no longer exists. Editing is the
last survivor of an abandoned pattern.

Beyond width, the inline approach loses in-progress work on refresh and cannot
be linked to.

## Approved Direction

Editing moves to its own screen at `/organizer/events/{eventId}/edit`, reached
from a button in the top-right of the event header. The screen shows the form and
a way back, and nothing else — the same treatment `/organizer/events/new`
already receives, for the same reason.

The button sits on the right rather than the left. The header's left corner
already holds the back arrow to "All events"; two icon controls in one corner
both read as page chrome and force the organizer to work out which is which. Left
means leave, right means act on this event.

The button lives in the header rather than on a card because what it edits — the
name, the dates, the location — is the header's own subject. It is not a property
of one card in one tab.

## Route Structure

The event layout draws the header and wraps every page beneath the event, so an
edit page nested under it would inherit that header, including a button pointing
at the page the organizer is already standing on.

The five tab segments — `overview`, `live`, `attendees`, `groups` and
`outcomes` — move into a `(tabs)` route group, and the layout moves with them.
Round-bracket folders are organisational only and contribute no path segment, so
every existing URL is unchanged. The `edit` segment then sits outside that group
and renders without the header or the tab bar.

The bare `[eventId]/page.tsx` stays where it is. It only redirects to the landing
tab and never renders, so no layout applies to it either way.

## Component Design

`EventHeader` takes one new optional prop: the href of the edit screen. When
present it renders a labelled link in the header's third grid column, which the
existing `auto minmax(0, 1fr) auto` template already declares and currently
leaves empty. When absent the header renders exactly as it does today.

The event layout decides whether to pass that href, using `acceptsResponses` on
the event state it has already loaded. Only an `open` event offers the link.
Locking is what fixes an event's details, and the backend answers 409 to any
edit after it — a control that cannot work is worse than no control.

`EventDetailsCard` loses its toggle state, its embedded `CreateEventForm`, its
Cancel button and its `editable` prop, and becomes read-only markup showing the
description and the capacity line. It no longer needs to run in the browser.
Overview keeps exactly one entry point into editing, in the header, rather than
one buried in a card.

The Overview page stops passing `editable`.

The edit page mirrors `new/page.tsx`. It proves the session and sends a caller
without one to the login screen. It loads the event; a rejected request goes to
login and an unreadable one goes to Overview. An event that is no longer `open`
redirects to Overview — the header will not be offering the link in that case,
but the URL is typeable and bookmarkable and needs an answer. Otherwise it
renders a back link to the event and `CreateEventForm` in edit mode, seeded with
the loaded event, on the same full-width treatment the create screen uses. Its
title is "Edit event", kept out of search indexes, matching the create screen.

`CreateEventForm` itself does not change. Its `mode="edit"` branch already exists
and its default save handler already navigates to `/organizer/events/{id}`, which
then routes the organizer to the tab appropriate to the event's state. The edit
page passes no save handler and inherits that behaviour. Both that default and
the card's current `window.location.reload()` are full document navigations; the
gain is a single shared mechanism landing the organizer somewhere defined, not a
lighter one.

## Error Handling

An event that locks while the edit screen sits open is unchanged behaviour: the
backend answers 409 and the form already reports "This event has locked — its
details are fixed now." No new handling is introduced for it.

Session expiry between page load and save is likewise unchanged — the form
already routes an unauthorized response back to the login screen.

## Testing and Verification

No new test suite. `CreateEventForm.interaction.test.ts` already drives the edit
flow end to end through `mode="edit"`, and that form is not changing — only where
it is mounted. Nothing currently references `EventDetailsCard` from a test, so
reducing it breaks no existing coverage. The edit page is a session check, a
fetch and a set of redirects.

Verification is the existing Bun suite, ESLint, a production Next.js build,
`git diff --check`, and browser checks at phone and desktop widths covering: the
header button appearing for an open event and absent once locked; the edit screen
rendering both form panes at full width; saving returning to the event; the
back link returning without saving; and a locked event's edit URL redirecting to
Overview.

## Acceptance Criteria

- Editing happens on `/organizer/events/{eventId}/edit`, showing the form and a
  back link and nothing else.
- The entry point is a labelled control in the top-right of the event header,
  present only while the event accepts responses.
- The back arrow keeps the header's left corner to itself.
- Every existing organizer URL resolves exactly as it does today.
- `EventDetailsCard` displays description and capacity and offers no editing.
- Saving returns to the event through `CreateEventForm`'s own default handler,
  the same path the create screen takes.
- A locked event offers no edit control and its edit URL lands on Overview.

## Out of Scope

- Any change to `CreateEventForm`'s fields, validation, layout or save behaviour.
- Any change to the backend event or update endpoints.
- Editing from the events list at `/organizer`.
- Editing anything a locked event still permits.
- Draft persistence or unsaved-change warnings on the edit screen.
- Restyling the event header beyond adding the one control.
