"use client";

import { useRef } from "react";
import { content } from "@/content";
import { SectionShell } from "@/components/ui/SectionShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MediaPlaceholder, type MediaAsset } from "@/components/ui/MediaPlaceholder";
import { getTestimonialScrollTarget } from "@/lib/interactions";

type QuoteTestimonial = {
  type: "quote";
  quote: string;
  name: string;
  title: string;
};

type VideoTestimonial = {
  type: "video";
  video: MediaAsset;
  name: string;
  title: string;
};

type TestimonialItem = QuoteTestimonial | VideoTestimonial;

export function Testimonials() {
  const { media, testimonials } = content;
  const items = testimonials.items as readonly TestimonialItem[];
  const feature = testimonials.items[0];
  const railItems = items.slice(1);
  const railAvatars = media.testimonialAvatars.slice(1);
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToDirection = (direction: 1 | -1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const firstCard = viewport.querySelector<HTMLElement>("[data-testimonial-card]");
    const track = viewport.firstElementChild;
    if (!firstCard || !track) return;

    const gap = parseFloat(getComputedStyle(track).columnGap || "0");
    const step = firstCard.offsetWidth + gap;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const target = getTestimonialScrollTarget({
      direction,
      scrollLeft: viewport.scrollLeft,
      maxScroll,
      step,
    });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    viewport.scrollTo({ left: target, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <SectionShell
      id="stories"
      act="warm"
      className="scroll-mt-20 bg-[#f4f4f5] md:scroll-mt-24"
    >
      <div className="flex flex-col items-start gap-4">
        <Eyebrow>{testimonials.eyebrow}</Eyebrow>
        <SectionHeading
          as="h2"
          lines={testimonials.headline}
          className="text-4xl text-ink md:text-5xl"
        />
      </div>

      <div className="mt-14 hidden md:block">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:gap-16">
          <article className="relative aspect-[1.06/1] overflow-hidden rounded-[2rem] shadow-[var(--shadow-media)]">
            <MediaPlaceholder
              className="absolute inset-0 h-full w-full [&_img]:object-[center_55%]"
              media={media.outcome}
              sizes="(max-width: 1023px) 54vw, 620px"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(18,18,18,0.86)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-paper lg:p-10">
              <p className="max-w-xl font-display text-2xl leading-snug lg:text-3xl">
                &ldquo;{feature.quote}&rdquo;
              </p>
              <p className="font-meta mt-4 text-[11px] tracking-[0.08em] text-paper/72">
                {feature.name} — {feature.title}
              </p>
            </div>
          </article>

          <OutcomeList outcomes={testimonials.outcomes} />
        </div>

      </div>

      <div className="mt-12 md:hidden">
        <div className="grid gap-4">
          <article className="relative aspect-square overflow-hidden rounded-[1.75rem]">
            <MediaPlaceholder
              className="absolute inset-0 h-full w-full [&_img]:object-[center_55%]"
              media={media.outcome}
              sizes="calc(100vw - 3rem)"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_32%,rgba(18,18,18,0.86)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-paper">
              <p className="font-display text-xl leading-snug">
                &ldquo;{feature.quote}&rdquo;
              </p>
              <p className="font-meta mt-3 text-[11px] tracking-[0.08em] text-paper/72">
                {feature.name} — {feature.title}
              </p>
            </div>
          </article>

          <OutcomeList compact outcomes={testimonials.outcomes} />
        </div>

      </div>

      <div
        aria-label="Customer stories"
        className="testimonial-rail testimonial-rail-viewport--faded relative mt-14"
        role="region"
      >
        <button
          aria-label="Previous story"
          className="testimonial-rail-arrow left-0 md:left-2"
          onClick={() => scrollToDirection(-1)}
          type="button"
        >
          <ChevronIcon direction="left" />
        </button>

        <div className="testimonial-rail-viewport" ref={viewportRef}>
          <div className="testimonial-rail-track">
            {railItems.map((story, index) => (
              <TestimonialCard
                key={story.type === "quote" ? story.quote : story.video.src}
                media={railAvatars[index]}
                story={story}
              />
            ))}
          </div>
        </div>

        <button
          aria-label="Next story"
          className="testimonial-rail-arrow right-0 md:right-2"
          onClick={() => scrollToDirection(1)}
          type="button"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <p className="font-meta mt-6 text-[10px] text-ash">
        Placeholder testimonials — replace in content.ts before launch.
      </p>
    </SectionShell>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 ${direction === "right" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function TestimonialCard({
  media,
  story,
}: {
  media: (typeof content.media.testimonialAvatars)[number];
  story: TestimonialItem;
}) {
  return (
    <article className="testimonial-rail-card bg-white" data-testimonial-card tabIndex={0}>
      {story.type === "video" ? (
        <MediaPlaceholder
          className="testimonial-rail-media"
          controls
          media={story.video}
          sizes="(max-width: 640px) 90vw, 40vw"
        />
      ) : (
        <div>
          <span aria-hidden="true" className="font-display text-4xl leading-none text-ink/25">
            &ldquo;
          </span>
          <p className="mt-3 font-display text-xl leading-snug text-ink">
            &ldquo;{story.quote}&rdquo;
          </p>
        </div>
      )}

      <div className="testimonial-rail-footer">
        <MediaPlaceholder className="testimonial-rail-avatar" media={media} sizes="48px" />
        <div className="min-w-0">
          <p className="font-medium text-ink">{story.name}</p>
          <p className="font-meta mt-1 text-[10px] leading-relaxed text-ink/68">{story.title}</p>
        </div>
      </div>
    </article>
  );
}

function OutcomeList({
  compact = false,
  outcomes,
}: {
  compact?: boolean;
  outcomes: readonly string[];
}) {
  return (
    <ol className={`flex flex-col justify-center${compact ? " mt-10" : ""}`}>
      {outcomes.map((outcome, index) => (
        <li
          className={`group grid grid-cols-[2.25rem_1fr] gap-x-5 border-t border-ink/12 py-8 first:pt-5 last:pb-5 ${compact ? "md:grid-cols-[2rem_1fr] md:py-7" : "md:grid-cols-[3rem_1fr] md:gap-x-7 md:py-10"}`}
          key={outcome}
        >
          <div className="flex flex-col items-start gap-3 pt-2">
            <span className="font-mono text-[10px] tracking-[0.14em] text-ink/38">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span aria-hidden="true" className="h-0.5 w-5 bg-ember" />
          </div>
          <span
            className={`font-display block font-bold leading-snug text-ink ${compact ? "text-base" : "text-lg sm:text-xl md:text-2xl"}`}
          >
            {outcome}
          </span>
        </li>
      ))}
      <li aria-hidden="true" className="border-t border-ink/12" />
    </ol>
  );
}
