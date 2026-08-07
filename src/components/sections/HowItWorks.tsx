"use client";

import { useState } from "react";
import { content } from "@/content";
import { SectionShell } from "@/components/ui/SectionShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { WeaveLoader } from "@/components/ui/WeaveLoader";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { clampPreviewIndex } from "@/lib/interactions";
import { fadeUp } from "@/lib/motion";

export function HowItWorks() {
  const reduce = Boolean(useReducedMotion());
  const { how, media } = content;
  const [activeStep, setActiveStep] = useState(0);
  const activeIndex = clampPreviewIndex(activeStep, media.how.length);
  const activeMedia = media.how[activeIndex];
  const activeStepData = how.steps[activeIndex];

  const selectStep = (index: number) => {
    setActiveStep(clampPreviewIndex(index, media.how.length));
  };

  return (
    <SectionShell id="how" act="warm" className="scroll-mt-20 md:scroll-mt-24">
      <div className="flex max-w-3xl flex-col items-start gap-4">
        <Eyebrow>{how.eyebrow}</Eyebrow>
        <SectionHeading
          as="h2"
          lines={how.headline}
          className="text-4xl text-ink md:text-5xl"
        />
      </div>

      <div className="mt-16 grid items-start gap-14 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] xl:gap-16">
        <div className="flex flex-col">
          {how.steps.map((step, index) => {
            const isActive = index === activeStep;

            return (
              <motion.button
                aria-controls="how-preview"
                aria-pressed={isActive}
                className="group grid w-full grid-cols-[2.5rem_1fr] gap-x-4 border-t border-ink/12 py-9 text-left outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-4 focus-visible:ring-offset-bone xl:grid-cols-[3rem_minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-x-6 md:py-11"
                data-active={isActive}
                initial={reduce ? false : "hidden"}
                key={step.n}
                onClick={() => selectStep(index)}
                onFocus={() => selectStep(index)}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") selectStep(index);
                }}
                type="button"
                variants={reduce ? undefined : fadeUp}
                viewport={{ once: true, amount: 0.45 }}
                whileInView={reduce ? undefined : "show"}
              >
                <span
                  className={`font-mono pt-1 text-xs transition-colors duration-200 ${isActive ? "text-ember" : "text-ink/38 group-hover:text-ember"}`}
                >
                  {step.n}
                </span>
                <h3
                  className="font-display text-2xl leading-tight text-ink md:text-3xl"
                  id={`how-step-title-${index}`}
                >
                  {step.title}
                </h3>
                <p className="col-span-2 mt-4 max-w-lg text-base leading-relaxed text-ink/58 xl:col-span-1 xl:mt-0">
                  {step.body}
                </p>

                {"computing" in step ? (
                  <div className="relative col-span-2 mt-7 aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] border-[6px] border-paper bg-paper shadow-[var(--shadow-media)] xl:hidden">
                    <WeaveLoader phrases={step.computing} />
                  </div>
                ) : (
                  <MediaPlaceholder
                    className="col-span-2 mt-7 aspect-[4/3] w-full rounded-[1.5rem] border-[6px] border-paper shadow-[var(--shadow-media)] xl:hidden"
                    loading={index === 0 ? "eager" : undefined}
                    media={media.how[index]}
                    sizes="calc(100vw - 48px)"
                  />
                )}
              </motion.button>
            );
          })}
          <div className="border-t border-ink/12" />
        </div>

        <div className="sticky top-28 hidden xl:block">
          <div
            aria-labelledby={`how-step-title-${activeStep}`}
            aria-live="polite"
            className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-[8px] border-paper bg-paper shadow-[var(--shadow-media)]"
            id="how-preview"
            role="region"
          >
            <AnimatePresence initial={false} mode="sync">
              <motion.div
                animate={{ clipPath: "inset(0 0 0 0)", filter: "blur(0px)", opacity: 1 }}
                className="absolute inset-0"
                exit={reduce ? { opacity: 0 } : { clipPath: "inset(8% 0 0 0)", filter: "blur(2px)", opacity: 0 }}
                initial={reduce ? false : { clipPath: "inset(0 0 8% 0)", filter: "blur(2px)", opacity: 0 }}
                key={activeIndex}
                transition={{ duration: reduce ? 0.01 : 0.24, ease: [0.23, 1, 0.32, 1] }}
              >
                {activeStepData && "computing" in activeStepData ? (
                  <WeaveLoader phrases={activeStepData.computing} />
                ) : (
                  <MediaPlaceholder
                    className="h-full w-full"
                    loading={activeStep === 0 ? "eager" : undefined}
                    media={activeMedia}
                    sizes="(max-width: 1023px) 34vw, 30vw"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
