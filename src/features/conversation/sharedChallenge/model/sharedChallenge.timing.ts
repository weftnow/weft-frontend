/**
 * Mirrors PHASE_2_SECONDS in the backend's app/icebreaker/timing.py.
 *
 * Phase 2 has no per-person timer, so the backend sends only a group deadline
 * and never a duration — the ring needs a total to draw against, and this is
 * it. The mock machine and the discussion screen both read this one value;
 * they drift from the backend the moment they disagree.
 *
 * They had drifted: this said 420 while the backend has always said 480. The
 * ring was drawn against seven minutes and the deadline was eight, so it hit
 * zero a full minute before the discussion actually ended.
 */
export const SHARED_CHALLENGE_SECONDS = 480;
