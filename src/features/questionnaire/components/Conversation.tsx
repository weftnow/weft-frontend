"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import type { ConversationItem } from "../types/questionnaire.types";
import { ConversationItemView } from "./ConversationItem";

type ConversationProps = {
  items: ConversationItem[];
  animatedItemId: string | null;
  enteringItemId?: string | null;
  composerVersion?: string;
  onTypingComplete: (itemId: string) => void;
};

export function Conversation({
  items,
  animatedItemId,
  enteringItemId,
  composerVersion,
  onTypingComplete,
}: ConversationProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nearEndRef = useRef(true);
  const lastFollowRef = useRef(0);
  const reducedMotion = useReducedMotion() ?? false;

  const followConversation = useCallback(
    (force = false) => {
      if (!force && !nearEndRef.current) return;
      if (typeof requestAnimationFrame === "undefined") return;
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "end",
        });
      });
    },
    [reducedMotion],
  );

  const followTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastFollowRef.current < 120) return;
    lastFollowRef.current = now;
    followConversation();
  }, [followConversation]);

  useEffect(() => {
    followConversation(true);
  }, [composerVersion, followConversation, items.length]);

  return (
    <section
      aria-label="Your conversation with Weft"
      className="questionnaire-conversation min-h-0 flex-1"
      data-animated-item-id={animatedItemId ?? undefined}
    >
      <div
        className="questionnaire-conversation-viewport h-full overflow-y-auto px-1 pb-7 pt-4"
        onScroll={() => {
          const viewport = viewportRef.current;
          if (!viewport) return;
          nearEndRef.current =
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            160;
        }}
        ref={viewportRef}
      >
        <ol className="mx-auto flex w-full max-w-[40rem] flex-col gap-7">
          {items.map((item) => (
            <ConversationItemView
              animate={item.id === animatedItemId}
              animateEntrance={item.id === enteringItemId}
              item={item}
              key={item.id}
              onTypingComplete={() => onTypingComplete(item.id)}
              onTypingProgress={followTyping}
            />
          ))}
        </ol>
        <div aria-hidden="true" className="h-px" ref={endRef} />
      </div>
    </section>
  );
}
