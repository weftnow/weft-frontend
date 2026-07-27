# Compatibility test redesign — design spec

Date: 2026-07-26
Scope: the compatibility test flow in `web-frontend` — quiz screens, details
form, share screen, pair result page, matches page. No backend changes; the
payloads from `weft_core` are used as they are.

## Why

The homepage is editorial and layered: mono eyebrows with ember rule ticks,
numbered `01/02` indexes, tonal shifts, ambient glows, the weave-thread motif,
staggered reveals. The test flow shares its tokens (colors, type, radii) but
not its rhythm — the result page in particular is a single centered column of
three identical white cards. The page that *is* the product's payoff reads as
a data dump, and nothing on it visually expresses "two people".

## Direction (approved)

Approach A: editorial single-scroll on the bone background. No dark tonal
band. The result page is re-architected into designed sections; the other
screens get the same vocabulary. No new dependencies. All styling stays in
the `ctest-*` system in `globals.css`; markup splits into focused components.

## Result page — `PairResultView` re-architecture

New section components under `components/compatibility/pair/`, composed by
`PairResultView` in this order. Same props (`result`, `shareToken`), same
data, no API changes.

### 1. `ScoreHero`

Kept structurally: eyebrow → giant ember percent → segmented five-band gauge
→ band sentence → mono score note. Only the vertical rhythm tightens so the
unit reads as one composed opening. The number stays un-animated (true from
first paint, per the existing comment); the gauge fill keeps its CSS entrance.

### 2. `SharedValues`

Card chrome removed. Ember rule tick + mono section label, then each shared
value as an editorial numbered entry: `01` ember mono index, display-weight
value name, tagline on the same line, blurb below at a readable measure
(~48ch). Empty state (no shared top value) is a single quiet sentence — no
empty card.

### 3. `DifferencePull`

The one-sentence difference set as a pull-quote: rule tick above, display
type around 1.7rem, no box. Uses the existing `result.difference` string.

### 4. `PeopleCompare` — the centerpiece

- Both names as column headers, joined by a small inline SVG: one ember
  thread and one signal thread interlacing once. Drawn in with a CSS
  `stroke-dashoffset` animation; no JS or hydration required.
- Per-column top values above the rows. A value present in both columns is
  marked with an ember tick (shared).
- **Head-to-head trait rows** replace the two per-person `dl` grids: one row
  per trait dimension (from `copy.traits` via `personTraits`), mono label
  centered, each person's phrasing left/right.
  - Dimension missing for one person: em-dash on that side.
  - Dimension missing for both: row omitted.
- Names are user input: `overflow-wrap: anywhere` stays.

### 5. `ShareClose`

Headline + sub as now. The share link sits in a real card — solid hairline
border, white glass background, mono URL — with the copy button attached to
the card rather than floating below. Falls back to the restart CTA without a
token, as now. Matches link stays the quiet mono footer.

### Entrance

The CSS `both`-fill staggered reveal on `.ctest-pair > *` stays and extends
to the new section count. Nothing on this page requires hydration to become
visible.

## Quiz screens

- Option cards gain mono index letters (`A`–`D`) top-left — the homepage's
  numbered-list device. Hover lift slightly stronger; selected state
  unchanged.
- Pick-two questions: the static "pick exactly two" helper becomes a live
  counter ("1 of 2") once picking starts.
- **Bug fix**: the disabled Next `PremiumButton`'s hand-glyph track overlaps
  the BACK link. The quiz footer gets real layout/gap so they cannot touch,
  and the hand marker is suppressed on disabled buttons.

## Details form

Same editorial framing as the rest: rule tick + mono label above the fields.
Input behavior and validation unchanged. Submit row aligned to the form grid.

## Share screen

Uses the same link-card treatment as `ShareClose`. `ShareLink` is already the
shared component — it gets the upgrade once and both screens inherit it.

## Matches page

Match cards keep the shared gauge + tabular percent, and gain a mono `01`
index per card and the same hover lift/border treatment as the quiz option
cards, plus the staggered CSS entrance the pair page uses.

## Motion & accessibility rules

- All entrances CSS-only with `both` fill — the existing no-hydration
  principle is load-bearing and stays.
- Every animation, including the new thread draw-in, is gated behind
  `prefers-reduced-motion: reduce`.
- No layout-shifting animation. Focus-visible keeps the signal outline
  convention. Existing roles/aria (radiogroup, gauge `role="img"`, alerts)
  are preserved through the restructure.

## Testing

Existing component tests (`PairResultView.test.tsx`, `CompatibilityTest.test.tsx`,
`DetailsForm.test.tsx`, `ShareScreen.test.tsx`, `MatchesView.test.tsx`, etc.)
are updated alongside the restructure: assertions follow content and roles,
not the removed card markup. New units (trait-row pairing, shared-value
marking) get their own tests where logic lands in `lib/` (e.g. a
`pairTraitRows` helper next to `personTraits` in `lib/pairView.ts`).

## Out of scope

- Backend/API changes; copy rewrites beyond what the new layouts need
  (any new strings go through `content.ts`).
- The homepage itself, including the dangling `content.ts` references to the
  two deleted placeholder files.
