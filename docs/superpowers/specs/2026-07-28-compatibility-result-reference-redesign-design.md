# Compatibility Result Reference Redesign

## Goal

Replace the current editorial pair-result presentation with a responsive result page based on the supplied desktop and mobile references, while displaying only information that the compatibility API actually returns.

The redesign must preserve the existing result semantics, accessibility, matches navigation, and test-sharing flow. It must not invent profile information or expose internal scoring signals.

## Visual Direction

The page uses the reference's warm off-white surface, hairline borders, restrained ember and green accents, rounded panels, generous whitespace, and centered compatibility score. It should feel like a polished part of the existing Weft compatibility experience rather than a separate application.

Desktop uses a centered, wide result column with a compact top navigation, a name-and-score hero, a two-column match/difference panel, an evaluation panel, and a closing share panel.

Mobile becomes a single-column flow inspired by the supplied phone reference:

1. Back navigation and result label
2. Result heading
3. The two participant names
4. Circular compatibility score
5. Stacked "You match on" and "You differ on" panels
6. Evaluation panel
7. Closing test-sharing panel

The reference's mobile "Match breakdown" section is intentionally omitted because the current API does not provide per-dimension scores.

## Data Boundaries

The page may render only these existing `PairResult` fields:

- `percent`
- `band`
- `headline`
- `shared_values`
- `difference`
- both participants' `name`, `top_values`, and measured comparison traits

The page will not display portraits, job titles, locations, distance, personality labels, per-dimension percentages, AI-data-point claims, or any other unsupported metadata.

The raw score and backend scoring vocabulary remain hidden, matching the current privacy contract.

## Page Structure

### Navigation

A compact "Back to matches" link appears above the result. The shared compatibility shell remains responsible for the page background and route back to the main Weft site.

### Result Hero

The hero contains a small "Compatibility result" label and a "Here's your match" heading. The two participant names frame the visual score on desktop and sit in a balanced two-column row above it on mobile.

The compatibility score becomes a circular progress treatment using the real `percent`. The accessible label continues to announce the score out of 100 and the compatibility band. The band appears as the short verdict inside or immediately below the circle.

Portrait blocks and all unsupported participant metadata are omitted. Decorative crossing threads may connect the names visually but carry no data.

### Match and Difference Panel

Desktop uses one bordered panel split into two columns. Mobile stacks two separate bordered panels.

"You match on" renders the shared values returned by the API, including their names, taglines, and blurbs. If there are no shared values, the existing empty-state sentence remains.

"You differ on" leads with the API's primary difference sentence and then renders only comparison-trait rows for which at least one participant has a measured value. Missing values use the existing accessible dash treatment. No additional differences are inferred.

### Evaluation Panel

A compact "How we evaluated this match" section explains the dimensions represented by the result. Its items are derived from the real result model: values plus the comparison traits that are present. It does not claim a fixed number of data points and does not show per-category scores.

### Closing Share Panel

The reference's "Start a conversation" and "Share match" controls are omitted.

When `shareToken` is present, the page keeps the existing share-link box so the participant can send the compatibility test to another person and receive a separate result with them. When no token is present, the existing "Take it yourself" action is shown instead.

The link to view all matches remains available in both states.

## Components

`PairResultView` remains the route-level composition component. The current pair subcomponents will be reshaped around these responsibilities:

- score and participant hero
- shared-value and difference summary
- evaluation explanation
- closing share-test action

Existing helpers for filtering unmeasured traits and identifying shared values remain the source of truth. Components should stay small enough to test independently, and no result-specific behavior should move into CSS.

## Responsive and Interaction Behavior

- Desktop keeps a spacious centered layout matching the supplied wide reference.
- Tablet and mobile switch to a single-column flow without horizontal scrolling.
- Long participant names and trait text wrap safely.
- The circular score scales down without clipping.
- Entrance motion remains subtle and respects reduced-motion preferences.
- Links and buttons retain visible keyboard focus.

## Testing

Tests will be written before production changes and will cover:

- the new result heading and structural sections
- both participant names and the circular score's accessible label
- shared values and the no-shared-values fallback
- the primary difference and only measured comparison traits
- omission of unsupported profile and score-breakdown content
- preservation of the share-test link when a token exists
- fallback action when a token is absent
- preservation of matches navigation
- prevention of raw scoring-signal leaks

After implementation, the focused component tests, full test suite, lint, and production build will run. The page will also be inspected at desktop and mobile viewport sizes against the supplied references.
