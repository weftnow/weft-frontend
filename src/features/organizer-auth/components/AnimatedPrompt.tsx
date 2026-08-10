"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment } from "react";
import styles from "./OrganizerAuth.module.css";

const ease = [0.23, 1, 0.32, 1] as const;

export function AnimatedPrompt({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const reduced = Boolean(useReducedMotion());
  let characterIndex = 0;
  const words = text.split(/\s+/).map((word) => ({
    word,
    characters: Array.from(word).map((character) => ({
      character,
      index: characterIndex++,
    })),
  }));
  const characterCount = Math.max(characterIndex, 1);
  const stagger = Math.min(0.035, 0.9 / characterCount);

  return (
    <span
      aria-hidden="true"
      className={`${styles.prompt} ${className}`.trim()}
      data-reduced-motion={reduced ? "true" : "false"}
    >
      <span
        style={{
          clipPath: "inset(50%)",
          height: 1,
          overflow: "hidden",
          position: "absolute",
          whiteSpace: "nowrap",
          width: 1,
        }}
      >
        {text}
      </span>
      {words.map(({ word, characters }, wordIndex) => (
        <Fragment key={`${word}-${wordIndex}`}>
          <span className={styles.promptWord}>
            {characters.map(({ character, index }) => (
              <motion.span
                animate={{
                  clipPath: "inset(0 0% 0 0)",
                  opacity: 1,
                  transform: "translate3d(0, 0, 0)",
                }}
                className={styles.promptCharacter}
                data-auth-character="true"
                initial={reduced ? false : {
                  clipPath: "inset(0 100% 0 0)",
                  opacity: 0,
                  transform: "translate3d(0, 0.16em, 0)",
                }}
                key={`${character}-${index}`}
                transition={{
                  delay: reduced ? 0 : 0.08 + index * stagger,
                  duration: reduced ? 0 : 0.16,
                  ease,
                }}
              >
                {character}
              </motion.span>
            ))}
          </span>
          {wordIndex < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}
