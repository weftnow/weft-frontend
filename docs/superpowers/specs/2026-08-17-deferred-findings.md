# Deferred Findings — from the edit-event-screen branch review

**Date:** 2026-08-17
**Status:** Open — deliberately not fixed on `feat/create-event-detail-and-editing`
**Source:** whole-branch review of `feat/create-event-detail-and-editing`

A whole-branch review before merging the edit-event work turned up problems that
all **predate** that work. One was fixed on the branch because it could silently
move a real event; the rest were deferred here so a focused branch stayed
focused. Each was verified against the source, not taken on the reviewer's word.

Already fixed, recorded so nobody re-reports it: the timezone chip on the create
and edit screens named the event's stored zone while the datetime boxes rendered
the viewer's wall-clock. Fixed in `fix(dashboard): the timezone chip names the
zone the boxes actually show`.

## 1. A single evening prints as a two-day range

**Where:** `EventHeader.tsx:47`, `model/eventDate.model.ts:32`

`toInstant` stores times as UTC via `toISOString()`. `formatEventDate` reads the
calendar date straight off the ISO string's leading `YYYY-MM-DD`. In any
UTC-negative zone an evening therefore crosses midnight in UTC and the header
prints two dates.

A Bogotá event running 17:00–21:00 on 1 September stores as `22:00Z` and
`02:00Z`, and the header reads *"1 September 2026 – 2 September 2026"*.

The trap for whoever fixes this: `formatEventDate`'s own doc comment explains
that it avoids `Date` and `toLocaleDateString` precisely so a Bogotá evening
does not render as the next day on a UTC server. That reasoning was sound when
the stored string carried local wall-clock. It stopped being true once storage
went UTC, so the comment now argues for a behaviour the function no longer has.
Fix the comment with the code.

Single-date display has the same skew, but it has always had it. Only the range
is new, and a range is where the error becomes visible as a wrong *duration*
rather than an off-by-one nobody notices.

## 2. The event update path has no tests

**Where:** `schemas/dashboard.schema.ts` (`eventUpdateSchema`),
`api/client/dashboard.client.ts` (`updateEvent`),
`app/api/organizer/events/[eventId]/route.ts` (the PATCH proxy),
`components/EventHeader.tsx` (the `editHref` gate),
`app/organizer/events/[eventId]/edit/page.tsx` (four redirects)

None of these are referenced by any test. The `ends_at` range check on the
update schema got its own commit and still has no case of its own. The POST
route beside the PATCH proxy has a `route.test.ts`; the PATCH proxy has none.

Concretely: delete the `acceptsResponses` guard from the edit page, or the
`409 → conflict` line in `dashboard.gateway.ts:60`, or point `updateEvent` at
the wrong URL — and `bun test` still reports 721 passing.

The mounted form suite covers edit mode, but it throws `DashboardClientError`
directly, so no 409 ever travels the real gateway → route → client path.

## 3. A 409 comes back as a 503

**Where:** `app/api/organizer/events/route.ts:36`,
`app/api/organizer/events/[eventId]/lock/route.ts:24`

Neither status ternary has a `conflict` arm, so a backend 409 returns HTTP 503
with a body of `{"code":"conflict"}` — the status and the body disagree. The
browser client keys off the status, so locking an already-locked event reports
"we're down" instead of "already locked".

Not a problem for editing: the PATCH proxy at
`app/api/organizer/events/[eventId]/route.ts` does map `conflict → 409`
correctly, which is why the locked-mid-edit message works.

## 4. Stale comments

- `CreateEventForm.tsx:133` — `heading`'s JSDoc cites "a surrounding control…
  e.g. a `<summary>`". That disclosure was deleted on this branch, and no caller
  passes `heading={null}` any more.
- `OrganizerAuth.module.css:383-389` — describes the `.newEvent` `<details>`
  disclosure deleted on this branch, and justifies a width that lives in
  `Dashboard.module.css`. `.newEvent` is referenced nowhere in `src/`.

## 5. Accessibility

- `CreateEventForm.tsx:334` — `aria-label` sits on a bare `<span>`, whose
  implicit role is `generic` and therefore cannot be named. The IANA zone
  reaches no assistive technology; `title` alone is mouse-only.
- `/organizer/events/new` and `/organizer/events/{id}/edit` have no `<h1>`. The
  form's `<h2>` is the top heading, with a second `<h2>` ("Settings") beside it.

## Not findings

Recorded so they are not re-litigated:

- `withEditForm` duplicating `withForm`'s mount/unmount boilerplate in the
  mounted suite. Deliberate — one helper serving both modes needs a branch in
  every line of it.
- The edit-mode save test using its `onCreated` callback purely as a
  synchronisation signal without asserting the saved event. The call-argument
  assertions carry the real verification.
