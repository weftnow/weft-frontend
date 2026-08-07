"use client";

import { content } from "@/content";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { motion, useReducedMotion } from "motion/react";

const railClasses = [
  "turn-media-card turn-media-card--one",
  "turn-media-card turn-media-card--two",
  "turn-media-card turn-media-card--three",
  "turn-media-card turn-media-card--four",
  "turn-media-card turn-media-card--five",
] as const;

const railSets = [
  { id: "source", isDuplicate: false },
  { id: "duplicate", isDuplicate: true },
] as const;

export function Turn() {
  const reduce = Boolean(useReducedMotion());
  const { media } = content;

  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden bg-bone px-6 pt-36 pb-24 text-center md:pt-52 md:pb-32"
      style={{
        backgroundImage:
          "radial-gradient(circle at 42% 50%, rgb(244 81 30 / 66%) 0, rgb(244 81 30 / 28%) 30%, transparent 66%), radial-gradient(circle at 82% 30%, rgb(0 144 222 / 24%) 0, transparent 32%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-bone to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-bone to-transparent"
      />

      <motion.div
        className="relative z-10 max-w-5xl overflow-hidden pb-2"
        initial={reduce ? false : "hidden"}
        viewport={{ once: true, amount: 0.65 }}
        whileInView={reduce ? undefined : "show"}
      >
        <motion.h2
          className="font-display text-4xl leading-[1.08] text-ink md:text-6xl"
          variants={
            reduce
              ? undefined
              : {
                  hidden: { transform: "translate3d(0, 108%, 0)" },
                  show: {
                    transform: "translate3d(0, 0, 0)",
                    transition: { duration: 0.66, ease: [0.23, 1, 0.32, 1] },
                  },
                }
          }
        >
          {content.turn.line.map((line) => (
            <span className="block" key={line.text}>
              {line.text}{" "}
              <span className="text-ember">{line.muted}</span>
            </span>
          ))}
        </motion.h2>
      </motion.div>

      <motion.div
        aria-label="Gallery of the Weft matching experience"
        className="turn-media-rail"
        initial={reduce ? false : { opacity: 0, transform: "translate3d(0, 32px, 0)" }}
        transition={{ delay: reduce ? 0 : 0.2, duration: 0.62, ease: [0.23, 1, 0.32, 1] }}
        viewport={{ once: true, amount: 0.3 }}
        whileInView={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
      >
        <div className="turn-media-viewport">
          <div className="turn-media-track">
            {railSets.map(({ id, isDuplicate }) => (
              <div
                aria-hidden={isDuplicate || undefined}
                className="turn-media-set"
                data-turn-media-set={id}
                key={id}
              >
                {media.heroRail.map((item, index) => (
                  <div className={railClasses[index % railClasses.length]} key={`${id}-${item.src}`}>
                    <MediaPlaceholder
                      className="h-full w-full"
                      media={item}
                      sizes="(max-width: 640px) 70vw, (max-width: 1024px) 42vw, 28vw"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
