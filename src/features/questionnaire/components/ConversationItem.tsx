"use client";

import { motion } from "motion/react";
import type { ConversationItem } from "../types/questionnaire.types";
import { TypewriterMessage } from "./TypewriterMessage";

type ConversationItemViewProps = {
  item: ConversationItem;
  animate: boolean;
  animateEntrance?: boolean;
  onTypingComplete?: () => void;
  onTypingProgress?: () => void;
};

export function ConversationItemView({
  item,
  animate,
  animateEntrance = false,
  onTypingComplete,
  onTypingProgress,
}: ConversationItemViewProps) {
  if (item.type === "answer") {
    return (
      <motion.li
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
        initial={animateEntrance ? { opacity: 0, y: 7 } : false}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      >
        <article
          aria-label="Your answer"
          className="max-w-[88%] rounded-[1.45rem] rounded-br-[0.45rem] bg-[color-mix(in_srgb,var(--color-ember)_10%,white)] px-5 py-3.5 text-[0.98rem] leading-7 text-ink sm:max-w-[78%]"
        >
          {item.display}
        </article>
      </motion.li>
    );
  }

  return (
    <motion.li
      animate={{ opacity: 1, y: 0 }}
      initial={animateEntrance ? { opacity: 0, y: 7 } : false}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
    >
      <article
        aria-label="Weft says"
        className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-3.5"
      >
        <span
          aria-hidden="true"
          className="grid size-11 place-items-center rounded-full border border-ink/10 bg-white/70"
        >
          <img alt="" height={25} src="/icon.svg" width={25} />
        </span>
        <div className="max-w-[33rem] rounded-[1.35rem] rounded-tl-[0.45rem] border border-ink/9 bg-white/32 px-5 py-4 text-[0.98rem] leading-7 text-ink">
          <TypewriterMessage
            animate={animate}
            content={item.content}
            onComplete={animate ? onTypingComplete : undefined}
            onProgress={animate ? onTypingProgress : undefined}
          />
        </div>
      </article>
    </motion.li>
  );
}
