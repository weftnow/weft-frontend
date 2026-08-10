"use client";

import { organizerAuthMessages } from "../i18n/organizerAuth.messages";
import { useRef, type KeyboardEvent } from "react";
import type { OrganizerLanguage } from "../types/organizerAuth.types";
import styles from "./OrganizerAuth.module.css";

const LANGUAGES = ["en", "es"] as const;

export function LanguageSelector({
  language,
  onChange,
}: {
  language: OrganizerLanguage;
  onChange: (language: OrganizerLanguage) => void;
}) {
  const messages = organizerAuthMessages[language];
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = (index + direction + LANGUAGES.length) % LANGUAGES.length;
    onChange(LANGUAGES[nextIndex]);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      aria-label={messages.languageLabel}
      className={styles.languageSelector}
      role="radiogroup"
    >
      {LANGUAGES.map((option, index) => (
        <button
          aria-checked={language === option}
          key={option}
          onClick={() => onChange(option)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          ref={(element) => { optionRefs.current[index] = element; }}
          role="radio"
          tabIndex={language === option ? 0 : -1}
          type="button"
        >
          {option === "en" ? messages.english : messages.spanish}
        </button>
      ))}
    </div>
  );
}
