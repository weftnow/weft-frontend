import Link from "next/link";
import { formatEventDate } from "../model/eventDate.model";
import type { EventState } from "../model/eventState.model";
import { ArrowLeftIcon } from "./icons";
import styles from "./Dashboard.module.css";

/**
 * What the organizer needs to know before reading a single number: which event
 * this is, and what stage it has reached.
 *
 * The state is a word inside a coloured pill, never a colour on its own. Six
 * states is more than colour can carry unaided, and "locked" versus "closed"
 * is exactly the distinction someone will get wrong at a glance in a dim room.
 */
export function EventHeader({
  name,
  state,
  startsAt,
  endsAt,
  location,
  submitted,
  editHref = null,
}: {
  name: string;
  state: EventState | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  submitted: number | null;
  /**
   * Where the edit screen lives, or null when this event cannot be edited.
   * Decided by the caller from the event's state rather than here: a locked
   * event answers 409 to any edit, and a control that cannot work is worse
   * than no control.
   */
  editHref?: string | null;
}) {
  const start = formatEventDate(startsAt);
  const end = formatEventDate(endsAt);
  // One phrase, not two dates: the end only earns its own mention when it
  // actually differs from the start, so a same-day event still reads as one
  // date rather than the same day twice.
  const date = start && end && end !== start ? `${start} – ${end}` : start;
  // Zero responses is worth saying out loud — it is the whole story of a new
  // event — so this is a null check, not a truthiness check.
  const responses =
    submitted === null
      ? null
      : `${submitted} ${submitted === 1 ? "response" : "responses"}`;

  return (
    <header className={styles.eventHeader}>
      <Link aria-label="All events" className={styles.back} href="/organizer">
        <ArrowLeftIcon />
      </Link>

      <div className={styles.eventTitleRow}>
        <h1 className={styles.eventTitle}>{name}</h1>
        {state ? (
          <span className={styles.state} data-state={state}>
            {state}
          </span>
        ) : null}
      </div>

      {/*
        The third column of .eventHeader's grid, which has been declared and
        empty since the header was written. It sits opposite the back arrow
        because left means leave and right means act on this event — two icons
        sharing the left corner would make the organizer work out which is
        which. Text rather than a pencil: there is no pencil in ./icons, and a
        labelled control needs no legend.
      */}
      {editHref ? (
        <Link className={styles.headerAction} href={editHref}>
          Edit event
        </Link>
      ) : null}

      {date || location || responses ? (
        <p className={styles.eventMeta}>
          {date ? <span>{date}</span> : null}
          {/* An absent location renders nothing at all — no "Location: —". */}
          {location ? <span>{location}</span> : null}
          {responses ? <span>{responses}</span> : null}
        </p>
      ) : null}
    </header>
  );
}
