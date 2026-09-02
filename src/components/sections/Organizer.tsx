"use client";

import { motion, useReducedMotion } from "motion/react";
import { content } from "@/content";
import { SectionShell } from "@/components/ui/SectionShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fadeUp } from "@/lib/motion";

/**
 * The rest of the page sells the attendee's evening. This is the only section
 * addressed to the person signing the invoice: what the job costs them, and
 * what lands in their inbox afterwards. It used to live in FAQ accordions,
 * where a buyer skimming the page never found it.
 */
export function Organizer() {
  const reduce = Boolean(useReducedMotion());
  const { organizer } = content;

  return (
    <SectionShell id="organizer" act="warm" className="scroll-mt-20 md:scroll-mt-24">
      <div className="flex max-w-3xl flex-col items-start gap-4">
        <Eyebrow>{organizer.eyebrow}</Eyebrow>
        <SectionHeading
          as="h2"
          lines={organizer.headline}
          className="text-4xl text-ink md:text-5xl"
        />
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink/60">
          {organizer.lead}
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:mt-16 md:grid-cols-2 md:gap-8">
        {organizer.blocks.map((block) => (
          <motion.div
            className="rounded-[2rem] bg-paper px-7 py-9 shadow-[var(--shadow-media)] sm:px-9 sm:py-11"
            initial={reduce ? false : "hidden"}
            key={block.title}
            variants={reduce ? undefined : fadeUp}
            viewport={{ once: true, amount: 0.3 }}
            whileInView={reduce ? undefined : "show"}
          >
            <h3 className="font-meta text-[10px] tracking-[0.14em] text-ink/45">
              {block.title}
            </h3>
            <ul className="mt-6 flex flex-col">
              {block.items.map((item) => (
                <li
                  className="grid grid-cols-[1.25rem_1fr] gap-x-4 border-t border-ink/10 py-5 first:border-t-0 first:pt-0 last:pb-0"
                  key={item}
                >
                  <span aria-hidden="true" className="mt-2.5 h-0.5 w-5 bg-ember" />
                  <span className="font-display text-lg leading-snug text-ink sm:text-xl">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}
