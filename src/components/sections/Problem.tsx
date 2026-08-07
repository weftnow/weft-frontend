"use client";

import { content } from "@/content";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { SectionShell } from "@/components/ui/SectionShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { motion, useReducedMotion } from "motion/react";
import { fadeUp } from "@/lib/motion";

export function Problem() {
  const reduce = Boolean(useReducedMotion());
  const { media, problem } = content;

  return (
    <SectionShell
      id="problem"
      act="dark"
      className="problem-tonal-transition scroll-mt-20 md:scroll-mt-24"
    >
      <div className="flex flex-col items-start gap-4">
        <span className="font-meta inline-flex items-center gap-2 rounded-full bg-paper/10 px-3 py-1 text-xs text-paper/70">
          <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden />
          {problem.eyebrow}
        </span>
          <SectionHeading
          as="h2"
          lines={problem.headline}
          className="max-w-3xl text-4xl text-paper md:text-5xl"
        />
      </div>

      <div className="mt-16 grid items-stretch gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:gap-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, transform: "translate3d(0, 32px, 0)" }}
          whileInView={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.66, ease: [0.23, 1, 0.32, 1] }}
        >
          <MediaPlaceholder
            className="aspect-[4/5] h-full min-h-[32rem] rounded-[2rem] border-[8px] border-paper/10 shadow-[var(--shadow-media)]"
            media={media.problem}
            priority
            sizes="(max-width: 1023px) calc(100vw - 48px), 52vw"
          />
        </motion.div>

        <ol className="flex flex-col justify-center">
          {problem.beats.map((beat, index) => (
            <motion.li
              key={beat.stat}
              className="group grid grid-cols-[2.25rem_1fr] gap-x-5 border-t border-paper/15 py-8 outline-none first:pt-5 last:pb-5 focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-4 focus-visible:ring-offset-ink md:grid-cols-[3rem_1fr] md:gap-x-7 md:py-10"
              initial={reduce ? false : "hidden"}
              tabIndex={0}
              variants={reduce ? undefined : fadeUp}
              viewport={{ once: true, amount: 0.4 }}
              whileInView={reduce ? undefined : "show"}
            >
              <div className="flex flex-col items-start gap-3 pt-2">
                <span className="font-mono text-[10px] tracking-[0.14em] text-paper/38">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden="true"
                  className="h-0.5 w-5 bg-ember transition-transform duration-200 ease-out group-hover:translate-x-2 group-focus-visible:translate-x-2"
                />
              </div>

              <div>
                <span className="font-display block text-lg font-bold leading-snug text-ember sm:text-xl md:text-2xl">
                  {beat.stat}
                </span>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-paper/55 transition-[color,transform] duration-200 ease-out group-hover:translate-x-2 group-hover:text-paper/82 group-focus-visible:translate-x-2 group-focus-visible:text-paper/82">
                  {beat.label}
                </p>
              </div>
            </motion.li>
          ))}
          <li className="border-t border-paper/15" aria-hidden="true" />
        </ol>
      </div>

      <p className="font-display mx-auto mt-20 max-w-3xl text-center text-2xl leading-snug text-paper/90 md:mt-24 md:text-3xl">
        {problem.kicker}
      </p>
    </SectionShell>
  );
}
