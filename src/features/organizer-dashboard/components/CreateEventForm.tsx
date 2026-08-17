"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createEvent as defaultCreateEvent,
  DashboardClientError,
} from "../api/client/dashboard.client";
import {
  eventCreateSchema,
  type EventCreateBody,
  type EventSummaryRow,
} from "../schemas/dashboard.schema";
import styles from "./Dashboard.module.css";

/** The sizes the matcher is built around. Mirrors Field(ge=4, le=6). */
const TABLE_SIZES = [4, 5, 6] as const;

export type CreateEventClient = {
  createEvent(body: EventCreateBody): Promise<EventSummaryRow>;
};

type CreateErrorCode = "name" | "unavailable";

const ERRORS: Record<CreateErrorCode, string> = {
  name: "Give the event a name so you can tell it apart later.",
  unavailable: "We couldn't create the event. Your details are still here — try again.",
};

/**
 * The form that turns a logged-in organizer with nothing into one with an event.
 *
 * All three fields are asked for upfront rather than hiding date and size
 * behind a disclosure, because the backend has no PATCH: whatever is submitted
 * here is permanent, and there is no DELETE to undo a mistake either. That also
 * explains the inFlight guard — a double-click would leave a duplicate event in
 * the list forever.
 *
 * `client` and `onCreated` are injected so the interaction suite can drive the
 * whole flow without a network or a router.
 */
export function CreateEventForm({
  client = { createEvent: defaultCreateEvent },
  heading = "Set up your first event",
  onCreated = (event: EventSummaryRow) =>
    window.location.assign(`/organizer/events/${event.id}`),
}: {
  client?: CreateEventClient;
  /** null where a surrounding control already names the form, e.g. a <summary>. */
  heading?: string | null;
  onCreated?: (event: EventSummaryRow) => void;
}) {
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [groupSize, setGroupSize] = useState<number>(5);
  const [error, setError] = useState<CreateErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error === "name") nameRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    // The datetime-local box reports local wall-clock time. Convert to an
    // instant here so the backend stores the moment the organizer meant rather
    // than a string whose timezone depends on who typed it.
    const when = startsAt ? new Date(startsAt) : null;
    const parsed = eventCreateSchema.safeParse({
      name,
      starts_at: when && !Number.isNaN(when.getTime()) ? when.toISOString() : null,
      group_size_target: groupSize,
    });
    if (!parsed.success) {
      setError("name");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await client.createEvent(parsed.data));
    } catch (reason) {
      if (
        reason instanceof DashboardClientError
        && reason.code === "unauthorized"
      ) {
        window.location.assign("/organizer/login");
        return;
      }
      setError("unavailable");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.createForm} noValidate onSubmit={submit}>
      {heading ? <h2 className={styles.createHeading}>{heading}</h2> : null}

      <label className={styles.createLabel}>
        <span>Event name</span>
        <input
          autoComplete="off"
          className={styles.createField}
          disabled={submitting}
          name="name"
          onChange={(event) => { setName(event.target.value); setError(null); }}
          placeholder="Founder Night Bogotá"
          ref={nameRef}
          type="text"
          value={name}
        />
      </label>

      <label className={styles.createLabel}>
        <span>
          When <span className={styles.createOptional}>(optional)</span>
        </span>
        <input
          className={styles.createField}
          disabled={submitting}
          name="starts_at"
          onChange={(event) => setStartsAt(event.target.value)}
          type="datetime-local"
          value={startsAt}
        />
      </label>

      <fieldset className={styles.createSizes} disabled={submitting}>
        <legend>Table size</legend>
        {TABLE_SIZES.map((size) => (
          <label className={styles.createSize} key={size}>
            <input
              checked={groupSize === size}
              name="group_size_target"
              onChange={() => setGroupSize(size)}
              type="radio"
              value={size}
            />
            <span>{size}</span>
          </label>
        ))}
        <p className={styles.createHint}>
          Tables of {groupSize}. This can&apos;t be changed once the event exists.
        </p>
      </fieldset>

      {error ? (
        <p className={styles.createError} role="alert">{ERRORS[error]}</p>
      ) : null}

      <button className={styles.primary} disabled={submitting} type="submit">
        {submitting ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
