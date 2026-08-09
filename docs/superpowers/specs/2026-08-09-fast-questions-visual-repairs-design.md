# Fast Questions Visual Repairs Design

## Intent

Repair the approved participant-avatar and timer-endpoint defects without changing Fast Questions state, timing, or route behavior.

## Avatar geometry

Each participant avatar frame owns a single responsive square dimension through a CSS custom property. The frame uses that dimension for both axes and clips its image. The image fills the frame with `object-fit: cover`, so differently proportioned portrait assets cannot expand the frame or turn it into an oval.

## Timer endpoint

`CircularTimer` renders a small ember SVG circle at the calculated terminal point of its progress arc. Its coordinate is derived from the same normalized progress and rotated top-origin geometry as the stroke, so the marker remains exactly on the ring throughout the countdown.

## Verification

Automated component/CSS tests assert the strict avatar-square contract and the marker’s accessible rendered representation. Chrome QA verifies the first portrait is circular and the marker follows the arc at a mobile viewport.
