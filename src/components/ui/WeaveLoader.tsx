"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function WeaveLoader({
  phrases,
  intervalMs = 2400,
}: {
  phrases: readonly string[];
  intervalMs?: number;
}) {
  const reduce = Boolean(useReducedMotion());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [phrases.length, intervalMs]);

  return (
    <div className="weave-loader">
      <div className="weave-loader-orbit">
        <span aria-hidden="true" className="weave-loader-halo" />
        <span aria-hidden="true" className="weave-loader-track" />
        <span aria-hidden="true" className="weave-loader-ring" />
        <img
          alt=""
          aria-hidden="true"
          className={`weave-loader-mark${reduce ? "" : " weave-loader-mark--spin"}`}
          height={50}
          src="/icon.svg"
          width={50}
        />
      </div>
      <div aria-live="polite" className="weave-loader-phrase">
        <AnimatePresence initial={false} mode="wait">
          <motion.p
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(4px)" }}
            initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
            key={phrases[index]}
            transition={{ duration: reduce ? 0.01 : 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {phrases[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
