# Circular Timer Marker Synchronization Design

## Intent

Keep the Fast Questions timer marker continuously attached to the terminal end of its visible progress arc while preserving the existing server-derived, once-per-second countdown updates.

## Root cause

The progress circle animates `stroke-dashoffset` with a one-second linear CSS transition. The marker is instead rendered at the next calculated SVG coordinate as soon as React receives the updated remaining time. For most of each second, the marker is therefore ahead of the animated arc.

## Approach

`CircularTimer` will retain its existing countdown inputs and SVG progress circle. Its marker will be placed in a transformable SVG group and rotated between consecutive arc positions with the same one-second linear transition applied to the arc. Both visual elements will therefore start and finish each interval together, with the marker centered on the progress circle's end cap.

## Scope

- Change only `CircularTimer` and its colocated component test/style module.
- Preserve the timer's accessibility labels, displayed time, reduced-motion behavior, layout, and countdown cadence.
- Do not introduce a client animation loop or alter the data-fetching lifecycle.

## Verification

Add a regression test that proves the marker participates in the same linear one-second transition as the progress arc, run the focused component test, then run lint and the complete test suite.
