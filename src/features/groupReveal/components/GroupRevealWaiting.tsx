import Image from "next/image";
import styles from "./GroupReveal.module.css";

/**
 * The screen between submitting and the reveal.
 *
 * It says "keep this page open" because that is now true: useGroupReveal polls
 * every two seconds and swaps this screen for the countdown on its own. The
 * sent link is the fallback for the guest who closed the tab anyway, or who
 * answered days before the event — both happen, so the screen names both.
 */
export function GroupRevealWaiting({
  status,
  detail,
  fallback,
}: {
  status: string;
  detail: string;
  fallback: string;
}) {
  return (
    <main className="questionnaire-shell questionnaire-state">
      <Image alt="" aria-hidden height={46} src="/icon.svg" width={46} />
      <section className={styles.waitingStage}>
        <h1 aria-live="polite" className={styles.waitingStatus}>
          {status}
        </h1>
        <p className={styles.waitingDetail}>{detail}</p>
        <p className={styles.waitingFallback}>{fallback}</p>
      </section>
    </main>
  );
}
