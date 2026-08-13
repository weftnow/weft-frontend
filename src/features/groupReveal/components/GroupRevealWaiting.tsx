import { WeaveLoader } from "@/components/ui/WeaveLoader";
import styles from "./GroupReveal.module.css";

export function GroupRevealWaiting({
  status,
  detail,
}: {
  status: string;
  detail: string;
}) {
  return (
    <main className="questionnaire-shell questionnaire-state">
      <section className={styles.waitingStage}>
        <div className={styles.waitingLoader}>
          <WeaveLoader phrases={[status]} />
        </div>
        <p className={styles.waitingDetail}>{detail}</p>
      </section>
    </main>
  );
}
