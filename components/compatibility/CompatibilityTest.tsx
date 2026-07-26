"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { content } from "@/content";
import { WeaveLoader } from "@/components/ui/WeaveLoader";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { DetailsForm } from "@/components/compatibility/DetailsForm";
import { ShareScreen } from "@/components/compatibility/ShareScreen";
import { firstUnansweredIndex, toBackendAnswers } from "@/lib/answers";
import type { QuizQuestion } from "@/lib/compatibilityQuestions";
import { EMPTY_DETAILS, type Details } from "@/lib/details";
import { decideSubmitOutcome } from "@/lib/submitOutcome";
import {
  ANALYZING_MS,
  backFromDetails,
  canAdvance,
  isSelected,
  nextQuizState,
  prevQuizState,
  progressFraction,
  toggleOption,
  type Answers,
  type Phase,
} from "@/lib/compatibility";

const AUTO_ADVANCE_MS = 460;

export function CompatibilityTest({ questions }: { questions: QuizQuestion[] }) {
  const reduce = Boolean(useReducedMotion());
  const data = content.compatibilityTest;

  const [phase, setPhase] = useState<Phase>("intro");
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [shareToken, setShareToken] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitInFlight = useRef(false);

  const question = questions[activeIndex];
  const required = question?.select ?? 1;

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  function advance() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const next = nextQuizState(activeIndex, questions.length);
    setPhase(next.phase);
    setActiveIndex(next.activeIndex);
  }

  function goBack() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const prev = prevQuizState(activeIndex);
    setPhase(prev.phase);
    setActiveIndex(prev.activeIndex);
  }

  function choose(optionId: string) {
    if (submitError) setSubmitError(null);
    // Always clear a pending auto-advance first -- otherwise deselecting the
    // already-chosen option (chosen === 0) leaves the earlier timer armed and
    // it fires later, advancing past this question with nothing recorded.
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const next = toggleOption(answers, question.id, optionId, question.kind, question.select);
    setAnswers(next);
    // A single-choice question moves on by itself; a pick-two waits for both.
    const chosen = next[question.id]?.length ?? 0;
    if (question.kind === "single" && chosen > 0) {
      advanceTimer.current = setTimeout(advance, reduce ? 120 : AUTO_ADVANCE_MS);
    }
  }

  function reset() {
    setAnswers({});
    setActiveIndex(0);
    setDetails(EMPTY_DETAILS);
    setShareToken("");
    setSubmitError(null);
    setPhase("intro");
  }

  /**
   * The only write in the flow. AnimatePresence's "wait" mode keeps the
   * details form mounted (and its submit button clickable) through its exit
   * transition, so the ref below -- not the phase change -- is what stops a
   * double-click from firing two POSTs.
   */
  async function submit(nextDetails: Details) {
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    setBusy(true);

    setDetails(nextDetails);
    setSubmitError(null);

    // Backstop only: per-question gating (the auto-advance on single-choice,
    // the disabled Next on pick-two) should already keep every question
    // answered by the time the visitor reaches the details form. If it
    // somehow doesn't, send them back to the first gap instead of letting
    // the backend's 400 -- which names no question -- strand them here.
    const firstGapIndex = firstUnansweredIndex(answers, questions);
    if (firstGapIndex !== -1) {
      setActiveIndex(firstGapIndex);
      setPhase("quiz");
      setSubmitError(data.details.incomplete);
      submitInFlight.current = false;
      setBusy(false);
      return;
    }

    setPhase("submitting");
    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextDetails, answers: toBackendAnswers(answers, questions) }),
      });
      const body = (await response.json().catch(() => null)) as
        | { share_token?: string; error?: string }
        | null;

      const outcome = decideSubmitOutcome(response.ok, body, data.details.failed);
      if (outcome.phase === "share") {
        setShareToken(outcome.token);
        setPhase("share");
      } else {
        setSubmitError(outcome.error);
        setPhase("details");
      }
    } catch {
      // Offline or the request never landed -- nothing was created, so the
      // form comes back with the answers still in state.
      setSubmitError(data.details.failed);
      setPhase("details");
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  }

  const fade = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -18, filter: "blur(6px)" },
      };
  const transition = {
    duration: reduce ? 0.01 : 0.42,
    ease: [0.23, 1, 0.32, 1] as const,
  };

  return (
    <div className="ctest-shell">
      <span aria-hidden className="ctest-ambient ctest-ambient--ember" />
      <span aria-hidden className="ctest-ambient ctest-ambient--signal" />
      <Link className="ctest-home" href="/">
        <span aria-hidden>&larr;</span> Weft
      </Link>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            {...fade}
            transition={transition}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <span className="ctest-eyebrow">{data.intro.eyebrow}</span>
            <h1 className="ctest-prompt">
              {data.intro.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-ink/60">
              {data.intro.sub}
            </p>
            <div className="mt-8">
              <PremiumButton
                tone="ember"
                onClick={() => {
                  setPhase("quiz");
                  setActiveIndex(0);
                }}
              >
                {data.intro.cta}
              </PremiumButton>
            </div>
          </motion.div>
        )}

        {phase === "quiz" && question && (
          <motion.div
            key={`q-${activeIndex}`}
            {...fade}
            transition={transition}
            className="relative z-10 flex w-full flex-col items-center text-center"
          >
            <div className="ctest-progressbar" aria-hidden>
              <span
                className="ctest-progressbar-fill"
                style={{ width: `${progressFraction(activeIndex, questions.length) * 100}%` }}
              />
            </div>
            <span className="ctest-eyebrow">
              Question {activeIndex + 1} of {questions.length}
            </span>
            <h2 className="ctest-prompt">{question.prompt}</h2>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink/45">
              {question.kind === "multi" ? data.helpers.pick2 : data.helpers.single}
            </p>
            <div
              className="ctest-grid"
              role={question.kind === "single" ? "radiogroup" : "group"}
              aria-label={question.prompt}
            >
              {question.options.map((option) => {
                const on = isSelected(answers, question.id, option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role={question.kind === "single" ? "radio" : "checkbox"}
                    aria-checked={on}
                    className={`ctest-option${on ? " ctest-option--on" : ""}`}
                    onClick={() => choose(option.id)}
                  >
                    <span>{option.label}</span>
                    <span aria-hidden className="ctest-option-check">
                      &#10003;
                    </span>
                  </button>
                );
              })}
            </div>
            {submitError && (
              <p className="ctest-error" role="alert">
                {submitError}
              </p>
            )}
            <div className="mt-8 flex items-center gap-5">
              <button
                type="button"
                onClick={goBack}
                className="font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
              >
                &larr; Back
              </button>
              {question.kind === "multi" && (
                <PremiumButton
                  tone="ink"
                  onClick={advance}
                  disabled={!canAdvance(answers, question.id, required)}
                >
                  Next
                </PremiumButton>
              )}
            </div>
          </motion.div>
        )}

        {phase === "details" && (
          <motion.div key="details" {...fade} transition={transition} className="relative z-10 w-full">
            <DetailsForm
              initialDetails={details}
              submitError={submitError}
              busy={busy}
              onBack={() => {
                const back = backFromDetails(questions.length);
                setPhase(back.phase);
                setActiveIndex(back.activeIndex);
              }}
              onSubmit={submit}
            />
          </motion.div>
        )}

        {phase === "submitting" && (
          <motion.div
            key="submitting"
            {...fade}
            transition={transition}
            className="relative z-10 h-64 w-full max-w-md"
          >
            <WeaveLoader
              phrases={data.loaderPhrases}
              intervalMs={Math.round(ANALYZING_MS / data.loaderPhrases.length)}
            />
          </motion.div>
        )}

        {phase === "share" && (
          <motion.div key="share" {...fade} transition={transition} className="relative z-10 w-full">
            <ShareScreen shareToken={shareToken} onRestart={reset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
