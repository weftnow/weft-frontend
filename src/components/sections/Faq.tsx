"use client";

import { useState } from "react";
import { content } from "@/content";
import { SectionShell } from "@/components/ui/SectionShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getNextOpenIndex } from "@/lib/interactions";
import { AnimatePresence, motion } from "motion/react";

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  const { faq } = content;

  return (
    <SectionShell id="faq" act="light" className="z-[3] bg-[#f5f5f5] !py-16 md:!py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Eyebrow>{faq.eyebrow}</Eyebrow>
          <SectionHeading
            as="h2"
            lines={faq.headline}
            className="text-4xl text-ink md:text-5xl"
          />
        </div>

        <div className="mt-8 flex w-full flex-col gap-2.5 md:mt-10 md:gap-3">
          {faq.items.map((item, i) => {
            const isOpen = open === i;
            const answerId = `faq-answer-${i}`;
            const questionId = `faq-question-${i}`;

            return (
              <div key={item.q} className="overflow-hidden rounded-[1.5rem] bg-white md:rounded-[1.75rem]">
                <button
                  aria-controls={answerId}
                  aria-expanded={isOpen}
                  id={questionId}
                  type="button"
                  onClick={() => setOpen((current) => getNextOpenIndex(current, i))}
                  className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3 px-6 py-5 text-left transition-colors duration-200 focus-visible:relative focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-signal md:grid-cols-[1.75rem_minmax(0,1fr)] md:gap-4 md:px-7 md:py-5 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink/[0.025]"
                >
                  <span
                    aria-hidden="true"
                    className={`font-display text-2xl font-light leading-none text-ink transition-transform duration-200 md:text-3xl ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                  <span className="text-pretty font-display text-base leading-snug text-ink md:text-lg">
                    {item.q}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      aria-labelledby={questionId}
                      id={answerId}
                      role="region"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
                      }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[60ch] pb-6 pl-12 pr-6 text-sm leading-relaxed text-ink/62 md:pb-7 md:pl-[4.75rem] md:pr-10 md:text-base">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
