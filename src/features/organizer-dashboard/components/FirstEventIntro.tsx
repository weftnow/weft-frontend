import Link from "next/link";
import { SAMPLE_NIGHT } from "../data/sampleNight";
import { ArrowRightIcon } from "./icons";
import styles from "./Dashboard.module.css";

/**
 * What sits above the form the first time someone opens Weft.
 *
 * The form alone answers "what do I type" and never answered "and then what?",
 * which is the question that decides whether a new organizer finishes setup:
 * creating the event is step one of five, and the four that matter happen over
 * the following days. The arc says so before they commit.
 *
 * The sample link is here because the settings rail asks for a table size, and
 * nobody can answer that having never seen a Weft room. It is deliberately
 * quieter than the form's own button — orientation, not a competing action.
 */
const STEPS = [
  "Create",
  "Share the link",
  "They answer",
  "Seat the room",
  "Tables revealed",
];

/** The first few tables, at a glance. Read from the sample so it cannot lie. */
const PREVIEW_TABLES = SAMPLE_NIGHT.groups.slice(0, 5);

export function FirstEventIntro() {
  return (
    <>
      <header className={styles.firstRunHead}>
        <h1 className={styles.firstRunTitle}>Set up your first evening</h1>
        <p className={styles.firstRunLede}>
          Guests answer a two-minute form. Weft seats the room.
        </p>
      </header>

      <ol aria-label="What happens next" className={styles.arc}>
        {STEPS.map((step, i) => (
          <li
            aria-current={i === 0 ? "step" : undefined}
            className={styles.arcStep}
            data-current={String(i === 0)}
            key={step}
          >
            <span aria-hidden="true" className={styles.arcDot} />
            {step}
          </li>
        ))}
      </ol>

      <Link className={styles.sampleCard} href="/organizer/sample">
        <span aria-hidden="true" className={styles.sampleRoom}>
          {PREVIEW_TABLES.map((group) => (
            <span className={styles.sampleTable} key={group.index}>
              {group.members.map((member, seat) => (
                <span
                  className={styles.sampleSeat}
                  data-confirmed={String(member.confirmed)}
                  key={member.display_name ?? seat}
                />
              ))}
            </span>
          ))}
        </span>
        <span className={styles.sampleText}>
          <span className={styles.sampleTitle}>See a finished night</span>
          <span className={styles.sampleMeta}>
            {SAMPLE_NIGHT.guests} guests · {SAMPLE_NIGHT.groups.length} tables ·
            nobody real
          </span>
        </span>
        <span aria-hidden="true" className={styles.sampleGo}>
          <ArrowRightIcon />
        </span>
      </Link>
    </>
  );
}
