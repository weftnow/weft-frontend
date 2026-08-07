"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment } from "react";
import { content } from "@/content";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PremiumButton } from "@/components/ui/PremiumButton";

const wordRevealDelay = 0.28;
const characterRevealStagger = 0.035;
const characterRevealDuration = 0.16;
const heroEase = [0.23, 1, 0.32, 1] as const;

function getHeadlineWords(
  lines: readonly { text: string; muted: string; accent?: string }[],
) {
  const accentWords = new Set(
    lines.flatMap(({ accent }) => accent?.split(/\s+/).filter(Boolean) ?? []),
  );
  let characterIndex = 0;

  return lines
    .flatMap(({ text, muted }) => [text, muted].filter(Boolean))
    .flatMap((line) => line.split(/\s+/).filter(Boolean))
    .map((word) => {
      const characters = Array.from(word).map((character) => ({
        character,
        index: characterIndex++,
      }));

      characterIndex += 1;

      return {
        characters,
        isAccent: accentWords.has(word.replace(/[^a-z]/gi, "")),
        word,
      };
    });
}

export function Hero() {
  const reduce = Boolean(useReducedMotion());
  const { hero } = content;
  const headlineWords = getHeadlineWords(hero.headline);
  const headline = headlineWords.map(({ word }) => word).join(" ");
  const characterCount = headlineWords.reduce(
    (count, { characters }) => count + characters.length,
    0,
  );
  const supportingDelay = wordRevealDelay + characterCount * characterRevealStagger + 0.24;

  return (
    <section className="hero-premium">
      <div aria-hidden="true" className="hero-ambient hero-ambient--ember" />
      <div aria-hidden="true" className="hero-ambient hero-ambient--signal" />

      <div className="hero-copy">
        <motion.div
          animate={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
          initial={reduce ? false : { opacity: 0, transform: "translate3d(0, 10px, 0)" }}
          transition={{ delay: reduce ? 0 : supportingDelay, duration: 0.4, ease: heroEase }}
        >
          <Eyebrow>{hero.ycLabel}</Eyebrow>
        </motion.div>

        <motion.h1 aria-label={headline} className="font-display text-balance hero-title" initial={false}>
          {headlineWords.map(({ characters, isAccent, word }, wordIndex) => (
            <Fragment key={`${word}-${wordIndex}`}>
              <span
                aria-hidden="true"
                className={`hero-title-word${isAccent ? " hero-title-accent" : ""}`}
                data-hero-word={word}
              >
                {characters.map(({ character, index }) => (
                  <motion.span
                    animate={{
                      clipPath: "inset(0 0% 0 0)",
                      opacity: 1,
                      transform: "translate3d(0, 0, 0)",
                    }}
                    className="hero-title-character"
                    initial={reduce ? false : {
                      clipPath: "inset(0 100% 0 0)",
                      opacity: 0,
                      transform: "translate3d(0, 0.16em, 0)",
                    }}
                    key={`${character}-${index}`}
                    transition={{
                      delay: reduce ? 0 : wordRevealDelay + index * characterRevealStagger,
                      duration: characterRevealDuration,
                      ease: heroEase,
                    }}
                  >
                    {character}
                  </motion.span>
                ))}
              </span>
              {wordIndex < headlineWords.length - 1 ? " " : ""}
            </Fragment>
          ))}
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
          className="hero-subtitle"
          initial={reduce ? false : { opacity: 0, transform: "translate3d(0, 16px, 0)" }}
          transition={{ delay: reduce ? 0 : supportingDelay + 0.1, duration: 0.48, ease: heroEase }}
        >
          {hero.sub}
        </motion.p>

        <motion.div className="hero-actions hero-actions--initial" initial={false}>
          <PremiumButton href="#contact" tone="ember">
            {hero.ctaPrimary}
          </PremiumButton>
          {/*
          <a className="hero-secondary-link" href="#how">
            <span>{hero.ctaSecondary}</span>
            <span aria-hidden="true">↘</span>
          </a>
          */}
        </motion.div>


      </div>
    </section>
  );
}
