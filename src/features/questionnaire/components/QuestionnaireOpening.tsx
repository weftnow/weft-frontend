"use client";

import Image from "next/image";
import { useState } from "react";
import { questionnaireMessages } from "../i18n/questionnaire.messages";
import type { Language } from "../schemas/questionnaire.contract.schema";
import type { Questionnaire } from "../types/questionnaire.types";

export function QuestionnaireOpening({
  questionnaire,
  onStart,
}: {
  questionnaire: Questionnaire;
  onStart: (language: Language) => Promise<void>;
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(questionnaire.language);
  const [starting, setStarting] = useState(false);
  const messages = questionnaireMessages[selectedLanguage];

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await onStart(selectedLanguage);
    } catch {
      setStarting(false);
    }
  };

  return (
    <main className="questionnaire-shell questionnaire-state">
      <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/52">
        {messages.openingEyebrow} · {questionnaire.eventName}
      </p>
      <h1 className="text-center text-2xl font-medium tracking-[-0.04em] text-ink">
        {messages.openingTitle}
      </h1>
      <p className="max-w-[26rem] text-balance text-center text-[0.95rem] leading-6 text-ink/60">
        {messages.openingSubtitle}
      </p>
      <div aria-label="Language" className="mt-1 flex gap-2" role="radiogroup">
        <button
          aria-checked={selectedLanguage === "en"}
          className={`rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal ${
            selectedLanguage === "en"
              ? "border-ember/48 bg-[color-mix(in_srgb,var(--color-ember)_8%,white)] text-[#c84419]"
              : "border-ink/14 text-ink/70"
          }`}
          disabled={starting}
          onClick={() => setSelectedLanguage("en")}
          role="radio"
          type="button"
        >
          {messages.english}
        </button>
        <button
          aria-checked={selectedLanguage === "es"}
          className={`rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal ${
            selectedLanguage === "es"
              ? "border-ember/48 bg-[color-mix(in_srgb,var(--color-ember)_8%,white)] text-[#c84419]"
              : "border-ink/14 text-ink/70"
          }`}
          disabled={starting}
          onClick={() => setSelectedLanguage("es")}
          role="radio"
          type="button"
        >
          {messages.spanish}
        </button>
      </div>
      <button
        className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
        disabled={starting}
        onClick={() => void start()}
        type="button"
      >
        {messages.start}
      </button>
    </main>
  );
}
