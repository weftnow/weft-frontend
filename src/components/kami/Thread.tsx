"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/**
 * One segment of the orange spine that runs the length of the page.
 *
 * Segments rather than a single page-long path: a continuous path would have
 * to know every section's measured offset to stay glued to the artwork it
 * threads through, and would need re-authoring at each breakpoint where the
 * two-column rows stack. A segment only has to fit its own box, which CSS
 * already positions.
 *
 * The box is stretched to fit (`preserveAspectRatio="none"`), so the path is
 * authored in a flat 0-100 space and the stroke is kept honest by
 * `vector-effect: non-scaling-stroke` in the stylesheet.
 */
/**
 * Drawn by uncovering it, not by animating its dash: `pathLength` works by
 * rewriting the dash array, and under `vector-effect: non-scaling-stroke` on a
 * stretched box the browser measures that dash in screen space against a
 * length in user space, so a half-drawn thread rendered as a broken dashed
 * line. A clip that grows along the thread's direction of travel has no such
 * mismatch.
 *
 * `false` on the server, `true` in the browser, without a setState-in-effect.
 * The thread's dash attributes only exist once motion is driving them, so
 * server and first client render have to agree that the path is not there yet.
 */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function Thread({
  d,
  className = "",
  style,
  reveal = "down",
}: {
  d: string;
  className?: string;
  style?: React.CSSProperties;
  /** The way the thread travels: down the page, or across it left to right. */
  reveal?: "down" | "right";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  // The path is mount-gated, not the <span>: the span has to exist for the
  // scroll target ref to attach and measure.
  const mounted = useSyncExternalStore(neverChanges, onClient, onServer);

  // Draw as the segment crosses the middle of the viewport: begun just before
  // it appears, finished well before it leaves, so the line is never still
  // growing in the part of the screen the reader is actually looking at.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 95%", "end 45%"],
  });
  const clipPath = useTransform(scrollYProgress, (progress) => {
    const hidden = `${(1 - Math.min(1, Math.max(0.02, progress))) * 100}%`;
    return reveal === "down"
      ? `inset(-2px -2px ${hidden} -2px)`
      : `inset(-2px ${hidden} -2px -2px)`;
  });

  return (
    <span
      aria-hidden="true"
      className={`kami-thread ${className}`.trim()}
      ref={ref}
      style={style}
    >
      {mounted ? (
        <motion.svg
          preserveAspectRatio="none"
          style={reduce ? undefined : { clipPath }}
          viewBox="0 0 100 100"
        >
          <path d={d} />
        </motion.svg>
      ) : null}
    </span>
  );
}
