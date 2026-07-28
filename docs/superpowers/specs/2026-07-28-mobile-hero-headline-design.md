# Mobile Hero Headline Design

## Goal

Ensure the landing-page hero headline remains fully readable on narrow phone screens.

## Design

The desktop headline treatment remains unchanged. At the existing mobile breakpoint, headline word wrappers will no longer be forced onto a single line. The headline will use a reduced, viewport-aware type scale and a slightly narrower reading measure so it wraps into intentional lines instead of overflowing the viewport.

The per-character reveal animation remains intact because the DOM structure and character spans do not change. Only the mobile layout rules change.

## Scope

- Modify `app/globals.css` mobile hero rules.
- Add a focused regression assertion to the Hero component test.
- Verify the landing page at a narrow viewport and run the focused test suite.

## Non-goals

- No copy, desktop, navigation, CTA, or animation-timing changes.
