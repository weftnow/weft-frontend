# Group Reveal Waiting-State Repair — Design Specification

**Date:** 2026-08-13  
**Status:** Approved  
**Scope:** `weft-web` group waiting state only

## Context

The group route currently renders its waiting state as two unstructured text
lines inside a standalone shell. That implementation bypasses the established
questionnaire shell, shared Weft loading treatment, global brand tokens, and
motion rules. It also falls short of the already-approved waiting direction in
`2026-08-12-automatic-group-reveal-design.md`, which calls for the Weft mark,
a calm progress treatment, and the warm Weft product language.

## Approved Direction

Make the waiting state feel like a direct continuation of the attendee
questionnaire. Reuse the existing questionnaire background and shared
`WeaveLoader` instead of introducing a second loading system or a one-off
illustration.

The waiting composition contains:

1. the existing animated Weft mark, ember orbit, and restrained halo;
2. the existing localized waiting status as the primary live phrase;
3. the existing localized supporting sentence beneath the loader;
4. no card, estimated duration, progress percentage, or additional action.

The content remains centered in the viewport with a readable narrow measure.
The warm bone surface, subtle ambient color, texture, Comfortaa display face,
Geist Mono utility treatment, ember accent, and ink text all come from the
current design system rather than hard-coded replacement colors.

## Component and State Design

`GroupRevealScreen` continues to own state selection and polling behavior. Its
waiting branch becomes a focused presentation that composes the shared
`WeaveLoader` within the group-reveal feature. The existing error, countdown,
revealed-group, confirmation, and navigation behavior remains unchanged.

The group shell aligns to the questionnaire shell visually without moving the
polling logic or duplicating questionnaire feature code. Any feature-local CSS
uses global design tokens. The loader receives one localized phrase so the
status does not rotate or repeatedly announce during polling; supporting copy
remains stable text outside its polite live region.

## Motion and Accessibility

The existing loader supplies the mark rotation, orbit, halo pulse, polite live
region, and reduced-motion behavior. Reduced motion keeps the message and
static Weft mark while removing decorative spinning and pulsing. Polling does
not trigger repeated announcements. Decorative graphics remain hidden from
assistive technology, and the supporting message preserves sufficient color
contrast.

## Testing and Verification

Implementation follows test-driven development. A presentation regression test
must fail against the current plain-text waiting state and then prove that the
waiting branch renders the shared branded loader plus both localized messages.
Existing group polling, countdown, and page-composition tests must remain
green.

Verification includes the focused regression test, the full Bun suite, ESLint,
the production Next.js build, `git diff --check`, and browser QA at phone and
desktop widths. Browser QA checks visual continuity with the questionnaire,
viewport centering, reduced motion, and the absence of overflow.

## Acceptance Criteria

- The waiting route immediately reads as part of Weft and as a continuation of
  the questionnaire experience.
- The shared animated weave mark is the primary progress signal.
- Existing English and Spanish waiting copy remains supported.
- The state does not look like floating text on an empty surface.
- No polling, countdown, reveal, confirmation, or navigation behavior changes.
- Motion preference and status announcement behavior remain accessible.

## Out of Scope

- Redesigning the countdown or revealed-group result.
- Adding event data to the group API contract.
- Creating a new illustration, animation system, or dependency.
- Changing polling cadence, error recovery, or backend behavior.
