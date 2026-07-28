# Questionnaire reference redesign — design spec

Date: 2026-07-27

Scope: the compatibility-test intro, question screens, and final details form in
`weft-web`. Results, matches, sharing screens, backend scoring, and API payloads
remain unchanged.

## Goal

Bring the questionnaire close to the supplied desktop and mobile references
while preserving Weft's existing behavior. The result should feel calm,
friendly, and premium: generous editorial spacing, tactile answer cards, a
clear sense of progress, and a quiet weave motif that stays alive throughout
the intake.

The questionnaire does not display the marketing-site navbar. It retains the
current minimal `← Weft` home control.

## Approved direction

The questionnaire uses:

- a continuous progress rail rather than one segment per question;
- neutral letter markers rather than semantic answer icons;
- two continuously moving thread lines with the Weft symbol at their crossing;
- a responsive two-column desktop / one-column mobile answer layout;
- the existing single-choice auto-advance behavior;
- an explicit Next button only for multi-choice questions;
- Back immediately to the left of Next whenever both are present.

This direction requires no `weft-core` or API changes. It deliberately avoids
icons derived from hidden scoring dimensions, which could reveal or bias what
the assessment measures.

## Visual system

### Canvas and framing

`CtestShell` remains the shared full-viewport frame. It uses the existing bone
background and restrained ember/signal ambient light. The intro, quiz, and
details form share one responsive content column and one visual rhythm.

No site navbar is rendered. The existing minimal `← Weft` control remains in
its current top-left position and continues linking home.

### Animated weave motif

Two thin paths cross the questionnaire horizontally:

- an ember thread;
- a pale signal-blue thread.

The Weft symbol sits at the visual crossing near the center of the motif. The
paths move continuously and slowly using transform-based animation so the
motion remains smooth and inexpensive. Their movement is ambient rather than
reactive: selecting an answer does not restart or jump the paths.

The motif occupies a defined band between the question heading and answer
cards. It does not sit behind legible text or interactive controls. On smaller
screens it spans beyond the viewport edges so no clipped endpoint is visible.

When `prefers-reduced-motion: reduce` is active, both paths remain static and
all nonessential transition timing is effectively removed.

### Typography and hierarchy

The existing Weft display and mono typefaces remain. Each question screen uses:

1. the continuous progress rail and count;
2. the existing contextual eyebrow/instruction;
3. the balanced display-size question prompt;
4. the selection hint;
5. the weave motif;
6. the answer cards;
7. validation or submission feedback;
8. Back/Next controls.

Long production questions must wrap naturally without colliding with the
motif. Width and type scale reduce at mobile breakpoints rather than forcing a
desktop composition into a narrow viewport.

## Progress

The quiz displays one continuous neutral rail with an ember fill. The fill is
computed from the existing `progressFraction(activeIndex, questions.length)`
helper and transitions smoothly between steps.

The visible count uses the actual served bank length, for example `2 of 20`;
the design does not hard-code 12 or 20. The rail and count are presented as one
progress unit. Screen-reader wording continues to identify the current
question and total.

## Answer cards

Each answer is a full-card button. Desktop uses two columns at the existing
questionnaire content width; mobile uses one column with comfortable touch
targets.

Every card contains:

- a softly tinted circular marker showing its neutral option letter
  (`A`, `B`, `C`, and so on);
- the backend-provided answer label;
- a circular selection indicator on the trailing edge.

Marker tints alternate through a restrained set of Weft-adjacent tones, but
letters—not colors—carry identity. The markers do not imply values, interests,
or correctness.

Selected cards receive an ember border, a subtle warm surface wash, and a
filled ember check indicator. Unselected cards keep a quiet hairline border
and empty indicator. Hover may add a small lift on pointer devices. Active and
focus states do not depend on hover, and the existing signal-colored
focus-visible treatment remains.

Radio/checkbox roles and `aria-checked` values stay unchanged.

## Interaction and navigation

The existing state and answer behavior are preserved:

- selecting a single-choice answer starts the current short auto-advance timer;
- selecting the active single-choice answer again before the timer clears it;
- multi-choice answers remain capped at the question's required count;
- multi-choice Next is disabled until the required count is met;
- going Back preserves previously selected answers;
- incomplete submission still returns the user to the first missing question.

The footer lays controls out in reading order: Back first, then Next. On
multi-choice screens they form one centered horizontal action group with Back
immediately left of Next. Single-choice screens retain Back without adding a
redundant Next button. Narrow screens preserve this ordering and provide
adequate separation and touch size.

## Intro

The intro adopts the same canvas, weave motif, typography, and primary ember
CTA as the quiz. Existing invite-specific copy and behavior remain untouched.
Its content stays centered and fits within a small mobile viewport without
hiding the opening behind vertical centering.

## Details form

The final name, email, and phone form adopts the same visual frame and
typographic hierarchy. Inputs, validation, labels, submit guard, timeout,
backend request, and error messages remain unchanged.

Its actions follow the same navigation rule: Back sits immediately to the left
of the primary submit CTA. On mobile the form remains readable above the
software keyboard and can scroll when the viewport is short.

## Component boundaries

- `CtestShell` owns the page frame, ambient background, existing home control,
  and reusable animated weave motif.
- `CompatibilityTest` retains phase state, answers, navigation timers, and
  submission behavior.
- A focused progress component renders the continuous rail and current/total
  count from explicit props.
- A focused option-card component renders one answer's marker, label, checked
  state, and accessible selection semantics.
- `DetailsForm` retains its current data and validation responsibilities while
  adopting the shared action and layout styling.

Purely decorative pieces are `aria-hidden`. No new runtime dependency is
required; the Weft symbol and paths use repository-native SVG/CSS.

## Error handling

Existing failure paths are unchanged:

- incomplete answers return to the first gap with an alert;
- details validation stays inline;
- failed or timed-out submission returns to the details screen;
- server response handling and stranded-result recovery remain as implemented.

The new layout must reserve enough room for an alert without covering the
navigation actions or causing the weave motif to overlap the message.

## Testing and verification

Tests are written before production changes and cover:

- progress count and fill based on the actual question bank length;
- neutral option letters beyond four choices;
- answer roles and checked states;
- single-choice auto-advance;
- multi-choice Next gating;
- Back-before-Next DOM and visual order;
- unchanged details validation and submission behavior;
- reduced-motion-safe decorative markup where behavior is testable.

Existing compatibility tests remain green. Final verification includes:

- targeted Bun component tests;
- the full test suite;
- ESLint;
- TypeScript/production build;
- browser inspection at representative desktop and mobile viewport sizes;
- keyboard navigation and reduced-motion checks.

## Out of scope

- Any change to `weft-core`, the bank schema, answer scoring, or API payloads.
- Semantic answer icons or hidden-value labels.
- Redesigning share, pair-result, or matches screens.
- Adding the marketing navbar to the questionnaire.
- Changing question copy or the number of questions served.
