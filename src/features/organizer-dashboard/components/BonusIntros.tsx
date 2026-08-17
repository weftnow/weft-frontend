"use client";

import { useState } from "react";
import styles from "./Dashboard.module.css";

export type BonusIntroPair = {
  person_a: string;
  person_b: string;
  strength: "strong" | "good" | "mixed";
};

/**
 * The one screen that is a task list, worked through in the last half hour of
 * the night. Big tap targets, phone-shaped: the host is standing up.
 *
 * The tick is local state — nothing stores it yet — so it survives working
 * down the list but not a refresh. Better than no tick, and honest about it.
 */
export function BonusIntros({ pairs }: { pairs: BonusIntroPair[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());

  if (pairs.length === 0) {
    return (
      <section className={`${styles.card} ${styles.wide}`}>
        <h2>No bonus introductions</h2>
        <p className={styles.caption}>
          Every strong pair in this room was seated together.
        </p>
      </section>
    );
  }

  return (
    <section className={`${styles.card} ${styles.wide}`}>
      <h2>Introduce these people</h2>
      <p className={styles.caption}>
        Pairs who scored well but could not sit together. Ticking only marks
        your place in the list — it is not saved.
      </p>
      <ul className={styles.checklist}>
        {pairs.map((pair, index) => (
          <li key={`${pair.person_a}-${pair.person_b}`} data-strength={pair.strength}>
            <label>
              <input
                type="checkbox"
                checked={done.has(index)}
                onChange={() =>
                  setDone((current) => {
                    const next = new Set(current);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })
                }
              />
              <span>
                {pair.person_a} &amp; {pair.person_b}
              </span>
              {/*
                The band is the reason a pair is on this list at all, so it
                belongs on the row — but as a quiet tag at the end, not as a
                second thing competing with the two names.
              */}
              <span className={styles.strength} data-strength={pair.strength}>
                {pair.strength}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
