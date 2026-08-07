"use client";

import { motion, useReducedMotion } from "motion/react";

type Line = { readonly text: string; readonly muted: string };

export function SectionHeading({
  lines,
  className = "",
  as = "h2",
}: {
  lines: readonly Line[];
  className?: string;
  as?: "h1" | "h2" | "p";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  const animateOnScroll = !reduce && as !== "h1";

  return (
    <div className="section-heading-mask">
      <Tag
        className={`font-display font-semibold text-balance ${className}`.trim()}
        initial={
          animateOnScroll
            ? { opacity: 0, transform: "translate3d(0, 24px, 0)" }
            : false
        }
        transition={{ duration: 0.52, ease: [0.23, 1, 0.32, 1] }}
        viewport={{ once: true, amount: 0.45 }}
        whileInView={
          animateOnScroll
            ? { opacity: 1, transform: "translate3d(0, 0, 0)" }
            : undefined
        }
      >
        {lines.map((line, index) => (
          <span className="block" key={`${line.text}-${index}`}>
            {line.text}
            {line.muted ? (
              <span className="text-ash"> {line.muted}</span>
            ) : null}
            {index < lines.length - 1 ? " " : null}
          </span>
        ))}
      </Tag>
    </div>
  );
}
