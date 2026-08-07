"use client";

import { content } from "@/content";
import { SectionShell } from "@/components/ui/SectionShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Counter } from "@/components/ui/Counter";
import { PortraitStack } from "@/components/ui/PortraitStack";

export function Reveal() {
  const { media, reveal } = content;

  return (
    <SectionShell id="reveal" act="light">
      <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-12 xl:gap-24">
        <div className="mx-auto min-w-0 w-full max-w-[640px]">
          <PortraitStack portraits={media.portraits} />
          <div className="mx-auto mt-5 flex max-w-sm items-start justify-between gap-6 border-t border-ink/10 pt-4">
            <p className="font-meta text-[10px] text-ink/68">Matched group</p>
            <p className="max-w-[15rem] text-right text-xs leading-relaxed text-ink/68">
              Hover, focus, or tap to bring the group together.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <Eyebrow>{reveal.eyebrow}</Eyebrow>
          <SectionHeading
            as="h2"
            lines={reveal.headline}
            className="mt-4 text-4xl text-ink md:text-5xl"
          />
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink/60">{reveal.body}</p>

          <div className="mt-10 grid grid-cols-1 gap-7 border-t border-ink/10 pt-8 sm:grid-cols-3 sm:gap-6">
            {reveal.stats.map((s, i) => (
              <div key={i}>
                <div className="font-display text-3xl font-bold text-ink md:text-4xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </div>
                <p className="mt-2 text-xs leading-snug text-ink/50">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="font-meta mt-6 text-[10px] text-ash">{reveal.statsNote}</p>
        </div>
      </div>
    </SectionShell>
  );
}
