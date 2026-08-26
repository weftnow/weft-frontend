import Image from "next/image";
import styles from "./GroupReveal.module.css";

/**
 * The screen between submitting and the reveal.
 *
 * It used to spin under "keep this page open". Both halves were false at a
 * conference: the wait is hours, not seconds, and nobody holds a tab open
 * overnight. What brings someone back now is the link they were sent, so this
 * screen's only job is to say their answers landed and what happens next.
 */
export function GroupRevealWaiting({ status, detail }: { status: string; detail: string }) {
  return (
    <main className="questionnaire-shell questionnaire-state">
      <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
      <section className={styles.waitingStage}>
        <h1 aria-live="polite" className={styles.waitingStatus}>
          {status}
        </h1>
        <p className={styles.waitingDetail}>{detail}</p>
      </section>
    </main>
  );
}
