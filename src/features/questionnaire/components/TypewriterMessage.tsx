"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type TypewriterMessageProps = {
  content: string;
  animate: boolean;
  onComplete?: () => void;
  onProgress?: () => void;
  characterDelayMs?: number;
};

const punctuationPause: Record<string, number> = {
  ".": 54,
  ",": 28,
  "?": 54,
  "!": 54,
  ":": 34,
};

export function shouldAnimateMessage(
  animate: boolean,
  reducedMotion: boolean,
) {
  return animate && !reducedMotion;
}

function characterDelay(
  character: string,
  index: number,
  baseDelay: number,
) {
  const variation = (index * 7) % 8;
  return baseDelay + variation + (punctuationPause[character] ?? 0);
}

export function TypewriterMessage({
  content,
  animate,
  onComplete,
  onProgress,
  characterDelayMs = 18,
}: TypewriterMessageProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const shouldType = shouldAnimateMessage(animate, reducedMotion);
  const [visibleText, setVisibleText] = useState(shouldType ? "" : content);
  const [complete, setComplete] = useState(!shouldType);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onProgressRef.current = onProgress;
  }, [onComplete, onProgress]);

  useEffect(() => {
    if (!animate) {
      setVisibleText(content);
      setComplete(true);
      return;
    }

    if (!shouldType) {
      setVisibleText(content);
      setComplete(true);
      onCompleteRef.current?.();
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let characterIndex = 0;
    const boundedBaseDelay = Math.max(
      10,
      Math.min(characterDelayMs, Math.floor(1_400 / Math.max(content.length, 1))),
    );

    setVisibleText("");
    setComplete(false);

    const typeNextCharacter = () => {
      if (cancelled) return;
      if (characterIndex >= content.length) {
        setComplete(true);
        onCompleteRef.current?.();
        return;
      }

      characterIndex += 1;
      const revealed = content.slice(0, characterIndex);
      const character = content[characterIndex - 1];
      setVisibleText(revealed);
      if (
        characterIndex % 6 === 0 ||
        punctuationPause[character] !== undefined
      ) {
        onProgressRef.current?.();
      }
      timer = setTimeout(
        typeNextCharacter,
        characterDelay(character, characterIndex, boundedBaseDelay),
      );
    };

    timer = setTimeout(typeNextCharacter, boundedBaseDelay);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [animate, characterDelayMs, content, shouldType]);

  return (
    <>
      <span aria-hidden={animate && !complete}>{visibleText}</span>
      {animate && complete ? (
        <span className="sr-only" role="status">
          {content}
        </span>
      ) : null}
    </>
  );
}
