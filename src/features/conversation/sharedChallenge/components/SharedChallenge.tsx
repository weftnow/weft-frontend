"use client";

import Image from "next/image";
import { CircularTimer } from "../../fastQuestions/components/CircularTimer";
import { useCountdown } from "../../fastQuestions/hooks/useCountdown";
import { messagesFor } from "../../i18n/conversation.messages";
import { SHARED_CHALLENGE_SECONDS } from "../model/sharedChallenge.timing";
import type { SharedChallengeSession } from "../types/sharedChallenge.types";
import styles from "./SharedChallenge.module.css";

export type SharedChallengeProps = {
  session: SharedChallengeSession;
};

export function SharedChallenge({ session }: SharedChallengeProps) {
  const messages = messagesFor(session.language);
  const remainingMilliseconds = useCountdown(session.timerEndsAt);
  // Cannot be blank — the challenge pool is seeded with five pre-written
  // fallbacks before the AI is ever called — but an empty heading is a worse
  // failure than a generic question, so the screen carries one of its own.
  const challenge = session.challenge.trim() || messages.challengeFallback;

  return (
    <main className={styles.shell}>
      <section aria-labelledby="shared-challenge-heading" className={styles.frame}>
        <Image alt="" aria-hidden className={styles.mark} height={42} src="/icon.svg" width={42} />
        <p className={styles.phaseLabel}>{messages.sharedChallengePhaseLabel}</p>
        <h1 className={styles.challenge} id="shared-challenge-heading">{challenge}</h1>
        <div className={styles.timer}>
          {/*
            No per-person timer and no reading gap, so the ring runs from the
            moment the screen appears. The total is the frontend's mirror of the
            backend's PHASE_2_SECONDS — the wire carries only a deadline.
          */}
          <CircularTimer
            durationSeconds={SHARED_CHALLENGE_SECONDS}
            messages={messages}
            remainingMilliseconds={remainingMilliseconds}
            running
          />
        </div>
        <p className={styles.guidance}>
          <span aria-hidden className={styles.guidanceIcon}>✦</span>
          <span>{messages.sharedChallengeGuidance}</span>
        </p>
      </section>
    </main>
  );
}
