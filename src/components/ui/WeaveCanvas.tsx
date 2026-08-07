"use client";

import { useScroll, useSpring, useTransform, motion, useReducedMotion } from "motion/react";

export function WeaveCanvas() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.4 });

  // Draw both threads in lockstep with scroll, but weighted toward the end of
  // the page: growth stays slow through the body copy and only catches up to
  // a full reveal as the footer wordmark scrolls into view, so the crossing
  // point lands on the logo instead of resolving mid-page.
  const draw = useTransform(progress, [0, 0.88, 1], [0, 0.32, 1]);
  const staticDraw = 1;

  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2] h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {/* Ember thread — starts near the left edge, weaves to right past the turn */}
      <motion.path
        d="M 4 0 C 4 37.8, 4 52.9, 50 75.5 C 96 82.9, 96 87.8, 96 100"
        fill="none"
        stroke="#F4511E"
        strokeWidth="0.28"
        strokeLinecap="round"
        style={{ pathLength: reduce ? staticDraw : draw }}
        opacity={0.32}
      />
      {/* Signal thread — mirror image, crosses the ember over the footer logo */}
      <motion.path
        d="M 96 0 C 96 37.8, 96 52.9, 50 75.5 C 4 82.9, 4 87.8, 4 100"
        fill="none"
        stroke="#0090DE"
        strokeWidth="0.28"
        strokeLinecap="round"
        style={{ pathLength: reduce ? staticDraw : draw }}
        opacity={0.22}
      />
    </svg>
  );
}
