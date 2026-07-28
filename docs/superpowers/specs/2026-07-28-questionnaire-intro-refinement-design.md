# Questionnaire Intro Refinement

## Scope

Refine only the compatibility-test intro. Question screens, details, results,
navigation behavior, animations, and backend integration remain unchanged.

## Copy

Replace the intro headline with two display lines:

1. `How compatible are you`
2. `with that person?`

This explicitly frames the questionnaire as a comparison with another person.
The existing eyebrow, supporting paragraph, and Begin action remain unchanged.

## Layout

Place the animated thread motif directly below the headline and above the
supporting paragraph. Preserve enough vertical space that the threads do not
cross any text or the Begin button.

Enlarge the Weft mark while keeping it centered on the threads' actual visual
crossing point. The alignment follows the path intersection rather than the
geometric midpoint of the SVG box, which currently makes the mark appear
slightly high.

## Responsive Behavior

The same hierarchy applies at desktop and mobile sizes:

1. Eyebrow and headline
2. Thread crossing with centered Weft mark
3. Supporting paragraph
4. Begin button

The motif remains decorative, non-interactive, continuously animated, and
hidden from assistive technology.

## Verification

- A content test asserts the exact two-line headline.
- A component test asserts a reserved intro motif gap between the headline and
  supporting paragraph.
- Browser QA confirms that the larger mark sits on the thread intersection and
  that neither thread overlaps readable content.
