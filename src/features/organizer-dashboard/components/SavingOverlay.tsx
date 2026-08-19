"use client";

import { WeaveLoader } from "@/components/ui/WeaveLoader";
import styles from "./Dashboard.module.css";

/**
 * The screen between pressing the button and the next one arriving.
 *
 * Deliberately not a progress bar. Creating an event is one request followed by
 * a full document load (CreateEventForm's onCreated hands off to
 * window.location.assign), and neither half reports how far along it is — so a
 * bar would be animating an invented number, and would either sit at 100% or
 * jump away at 60%. The weave is indeterminate and honest about it.
 *
 * It is the same loader the guests see while they wait for their table, which
 * is the point: one mark, both sides of the product.
 *
 * There is no minimum-visible timer holding it up. The flash it would guard
 * against — appearing and vanishing inside a couple of frames — is prevented at
 * the other end instead: the CSS holds the overlay transparent for its first
 * moments, so a failure that comes back faster than that is never painted at
 * all. Delaying the appearance beats padding the disappearance, because it
 * costs a fast failure nothing rather than making the person wait to read it.
 */
export function SavingOverlay({
  active,
  message,
}: {
  active: boolean;
  message: string;
}) {
  if (!active) return null;

  return (
    <div className={styles.savingOverlay}>
      <WeaveLoader phrases={[message]} />
    </div>
  );
}
