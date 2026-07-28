"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { content } from "@/content";
import { WeaveLoader } from "@/components/ui/WeaveLoader";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { CtestShell } from "@/components/compatibility/CtestShell";
import { DetailsForm } from "@/components/compatibility/DetailsForm";
import { QuizOptionCard } from "@/components/compatibility/QuizOption";
import { QuizProgress } from "@/components/compatibility/QuizProgress";
import { ShareScreen } from "@/components/compatibility/ShareScreen";
import { firstUnansweredIndex, toBackendAnswers } from "@/lib/answers";
import type { QuizQuestion } from "@/lib/compatibilityQuestions";
import { EMPTY_DETAILS, type Details } from "@/lib/details";
import { withName } from "@/lib/inviteText";
import { pairHref } from "@/lib/links";
import { decideSubmitOutcome, strandedOutcome } from "@/lib/submitOutcome";
import {
  LOADER_CYCLE_MS,
  backFromDetails,
  canAdvance,
  isSelected,
  nextQuizState,
  pickTwoHint,
  prevQuizState,
  toggleOption,
  type Answers,
  type Phase,
} from "@/lib/compatibility";

const AUTO_ADVANCE_MS = 460;

/**
 * The browser's own ceiling on the one request that writes. `weftFetch` gives
 * the server 8s; without this the browser would wait indefinitely on a hung
 * connection, with the loader spinning and no way out.
 *
 * Comfortably longer than the server's timeout, so a slow-but-alive backend
 * produces the server's clean error rather than this one's blank failure.
 */
const SUBMIT_TIMEOUT_MS = 15000;

/**
 * The whole quiz, for either person. `invite` is what makes the difference:
 * present means this visitor arrived on someone's link, so the intro addresses
 * the sender, the submission carries their token, and finishing produces a
 * pair result instead of a share link.
 */
export function CompatibilityTest({
  questions,
  invite,
}: {
  questions: QuizQuestion[];
  invite?: { token: string; fromName: string };
}) {
  const reduce = Boolean(useReducedMotion());
  const data = content.compatibilityTest;

  const [phase, setPhase] = useState<Phase>("intro");
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [shareToken, setShareToken] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stranded, setStranded] = useState<{ pairId: string; shareToken: string } | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitInFlight = useRef(false);

  const question = questions[activeIndex];
  const required = question?.select ?? 1;

  // One intro, two audiences. Computed here so the markup below stays a single
  // block rather than two near-identical ones.
  const intro = invite
    ? {
        eyebrow: data.invite.eyebrow,
        headline: [withName(data.invite.headline, invite.fromName)] as readonly string[],
        sub: data.invite.sub,
        cta: withName(data.invite.cta, invite.fromName),
      }
    : data.intro;

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
    setStranded(null);
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
    // Set on the one path that leaves this page. The in-flight guard is
    // deliberately left engaged while the navigation commits -- releasing it
    // would let a second click POST a second pair into existence.
    let leaving = false;
    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
        body: JSON.stringify({
          ...nextDetails,
          answers: toBackendAnswers(answers, questions),
          ...(invite ? { invite_token: invite.token } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { share_token?: string; pair_id?: string; error?: string }
        | null;

      const outcome = decideSubmitOutcome(response.ok, body, data.details.failed);
      if (outcome.phase === "pair") {
        // A full navigation: the pair page is force-dynamic SSR, so this
        // fetches the rendered result rather than transitioning into a page
        // that would have to fetch anyway. The loader stays up until it lands.
        try {
          window.location.assign(pairHref(outcome.pairId, outcome.shareToken));
          leaving = true;
        } catch {
          // The pair already exists upstream -- the POST succeeded. Retrying
          // would create a second one, so this is terminal: show the result's
          // address rather than a button that would do damage.
          const dead = strandedOutcome(outcome);
          setStranded({ pairId: dead.pairId, shareToken: dead.shareToken });
          setPhase("stranded");
          leaving = true;
        }
        return;
      }
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
      if (!leaving) {
        submitInFlight.current = false;
        setBusy(false);
      }
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
    <CtestShell
      showWeave={phase === "intro" || phase === "quiz" || phase === "details"}
    >
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            {...fade}
            transition={transition}
            className="ctest-stage ctest-stage--intro"
          >
            <span className="ctest-eyebrow">{intro.eyebrow}</span>
            <h1 className="ctest-prompt">
              {intro.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-ink/60">
              {intro.sub}
            </p>
            <div className="mt-8">
              <PremiumButton
                hand={false}
                tone="ember"
                onClick={() => {
                  setPhase("quiz");
                  setActiveIndex(0);
                }}
              >
                {intro.cta}
              </PremiumButton>
            </div>
          </motion.div>
        )}

        {phase === "quiz" && question && (
          <motion.div
            key="quiz"
            {...fade}
            transition={transition}
            className="ctest-stage ctest-stage--quiz"
          >
            <QuizProgress
              activeIndex={activeIndex}
              labelTemplate={data.quiz.progress}
              total={questions.length}
            />
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={`q-${activeIndex}`}
                {...fade}
                className="ctest-question"
                transition={transition}
              >
                <span className="ctest-eyebrow">{data.quiz.eyebrow}</span>
                <h2 className="ctest-prompt">{question.prompt}</h2>
                <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink/45">
                  {question.kind === "multi"
                    ? pickTwoHint(
                        answers[question.id]?.length ?? 0,
                        data.helpers.pick2,
                        data.helpers.pick2Count,
                      )
                    : data.helpers.single}
                </p>
                <div
                  className="ctest-grid"
                  role={question.kind === "single" ? "radiogroup" : "group"}
                  aria-label={question.prompt}
                >
                  {question.options.map((option, optionIndex) => {
                    const on = isSelected(answers, question.id, option.id);
                    return (
                      <QuizOptionCard
                        key={option.id}
                        kind={question.kind}
                        onChoose={() => choose(option.id)}
                        option={option}
                        optionIndex={optionIndex}
                        selected={on}
                      />
                    );
                  })}
                </div>
                {submitError && (
                  <p className="ctest-error" role="alert">
                    {submitError}
                  </p>
                )}
                <div className="ctest-quiz-footer">
                  <button
                    type="button"
                    onClick={goBack}
                    className="ctest-back"
                  >
                    <span aria-hidden>&larr;</span> {data.quiz.back}
                  </button>
                  {question.kind === "multi" && (
                    <PremiumButton
                      hand={false}
                      tone="ember"
                      onClick={advance}
                      disabled={!canAdvance(answers, question.id, required)}
                    >
                      {data.quiz.next}
                    </PremiumButton>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
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
              intervalMs={Math.round(LOADER_CYCLE_MS / data.loaderPhrases.length)}
            />
          </motion.div>
        )}

        {phase === "share" && (
          <motion.div key="share" {...fade} transition={transition} className="relative z-10 w-full">
            <ShareScreen shareToken={shareToken} onRestart={reset} />
          </motion.div>
        )}

        {phase === "stranded" && stranded && (
          <motion.div key="stranded" {...fade} transition={transition} className="relative z-10 w-full">
            <div className="flex w-full flex-col items-center text-center">
              {/* Their result exists -- that is the fact to lead with. The
                  share eyebrow ("Your link is ready") would be a lie here. */}
              <span className="ctest-eyebrow">{data.pair.eyebrow}</span>
              <p className="ctest-error" role="alert">
                {data.details.stranded}
              </p>
              {/* A real anchor, not just the text: assign() failed, but an
                  ordinary link click is a different code path and may work. */}
              <a className="ctest-linkbox mt-7" href={pairHref(stranded.pairId, stranded.shareToken)}>
                {pairHref(stranded.pairId, stranded.shareToken)}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CtestShell>
  );
}
