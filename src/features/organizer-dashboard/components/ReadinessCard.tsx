import { readiness, type EventState } from "../model/eventState.model";
import { CheckIcon } from "./icons";
import styles from "./Dashboard.module.css";

const LABELS: Record<string, string> = {
  form: "Guest form ready",
  responses: "Responses arriving",
  matched: "Tables formed",
  revealed: "Tables revealed",
};

/**
 * Where the night has got to.
 *
 * The four steps come from `readiness()`, which reads them off the counts and
 * the event's state rather than storing progress of its own — so this card
 * cannot disagree with the numbers beside it.
 *
 * Each pending step says what will tick it rather than only that it has not
 * happened. "Runs when you close the form" is an answer; an unticked box is a
 * question.
 */
export function ReadinessCard({
  state,
  submitted,
  groups,
}: {
  state: EventState;
  submitted: number;
  groups: number;
}) {
  const notes: Record<string, string> = {
    form:
      state === "open"
        ? "Open, and accepting answers"
        : "Closed — no new guests can join",
    responses:
      submitted > 0
        ? `${submitted} ${submitted === 1 ? "guest has" : "guests have"} answered`
        : "Waiting on your first guest",
    matched:
      groups > 0
        ? `${groups} ${groups === 1 ? "table" : "tables"}`
        : "Runs when you close the form",
    revealed:
      groups > 0 ? "Guests can see their table" : "Nobody has seen their table yet",
  };

  return (
    <section className={`${styles.card} ${styles.minor}`}>
      <h2>Where you are</h2>
      <ul className={styles.checkList}>
        {readiness({ submitted, groups }, state).map((step) => (
          <li className={styles.checkRow} data-done={String(step.done)} key={step.key}>
            <span className={styles.checkMark}>
              <CheckIcon />
            </span>
            <span>
              <span className={styles.checkLabel}>{LABELS[step.key] ?? step.key}</span>
              <span className={styles.checkNote}>{notes[step.key]}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
