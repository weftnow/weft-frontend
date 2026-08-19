"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  createEvent as defaultCreateEvent,
  updateEvent as defaultUpdateEvent,
  DashboardClientError,
} from "../api/client/dashboard.client";
import {
  eventCreateSchema,
  eventUpdateSchema,
  type EventCreateBody,
  type EventSummaryRow,
  type EventUpdateBody,
} from "../schemas/dashboard.schema";
import { SavingOverlay } from "./SavingOverlay";
import styles from "./Dashboard.module.css";

/** The sizes the matcher is built around. Mirrors Field(ge=4, le=6). */
const TABLE_SIZES = [4, 5, 6] as const;

/**
 * The machine's clock settings never change under a mounted form, so there is
 * nothing to subscribe to. Reading them through useSyncExternalStore rather
 * than an effect is the same trade ShareFormLink makes for `location`: the
 * server gets its own snapshot, so hydration has nothing to disagree about,
 * and no cascading render is spent arriving at the answer.
 */
const NEVER_CHANGES = () => () => {};
const EMPTY_ON_SERVER = () => "";

export type CreateEventClient = {
  createEvent(body: EventCreateBody): Promise<EventSummaryRow>;
  updateEvent(eventId: string, body: EventUpdateBody): Promise<EventSummaryRow>;
};

type CreateErrorCode =
  | "name"
  | "ends_at"
  | "capacity"
  | "unavailable"
  | "conflict";

const ERRORS: Record<CreateErrorCode, string> = {
  name: "Give the event a name so you can tell it apart later.",
  ends_at: "The end has to come after the start.",
  capacity: "Capacity has to be at least one seat. Leave it empty for unlimited.",
  unavailable: "We couldn't save the event. Your details are still here — try again.",
  // Not a failure the organizer caused, and not something a retry fixes, so it
  // gets its own sentence rather than joining the "try again" story.
  conflict: "This event has locked — its details are fixed now.",
};

/** The instant a `datetime-local` box means, or null if it is empty or junk. */
function toInstant(value: string): string | null {
  if (!value) return null;
  const when = new Date(value);
  return Number.isNaN(when.getTime()) ? null : when.toISOString();
}

/**
 * The reverse: an ISO instant as the wall-clock string the box wants.
 *
 * A `datetime-local` box has no zone of its own — it can only ever hold a bare
 * wall-clock reading — so the only honest one to put in it is the viewer's,
 * which is what every getter here returns. That is also why the chip beside
 * the boxes has to name the viewer's zone and not the event's stored one: the
 * chip is a label for what is in the boxes.
 *
 * Reading the host's zone is something the server cannot do meaningfully, so
 * the callers below reach this through useSyncExternalStore getSnapshot
 * callbacks whose server snapshot is empty.
 */
function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
    `${pad(when.getHours())}:${pad(when.getMinutes())}`,
  ].join("T");
}

/**
 * "COT", "GMT+8" — what the zone is called where the organizer is sitting.
 *
 * The chip carries the full IANA name in `title` and `aria-label`, because the
 * abbreviation is a reminder for someone who already knows their own zone and
 * an unreadable code for everyone else.
 */
function zoneLabel(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((part) => part.type === "timeZoneName")?.value ?? zone;
  } catch {
    return zone;
  }
}

/**
 * The event screen: everything an organizer sets, on one surface.
 *
 * Two panes, following `src/create-event-demo/2.jpeg`. The left is what guests
 * read — the name, when and where, the description — with the name as an
 * oversized borderless field rather than a labelled box, because it is the
 * title of the thing being made and not one input among four. The right is the
 * settings rail: table size, capacity. They are separated by a firm border and
 * a change of background rather than by the reference's glow, which has nothing
 * to sit against on #fbfaf8.
 *
 * `mode="edit"` reuses the whole screen rather than building a second one. The
 * differences are small and all of them are about what cannot change: table
 * size is fixed once the room has been scored for it, and a locked event
 * answers 409 to any edit at all.
 *
 * `client` and `onCreated` are injected so the interaction suite can drive the
 * whole flow without a network or a router.
 */
export function CreateEventForm({
  mode = "create",
  event,
  client = { createEvent: defaultCreateEvent, updateEvent: defaultUpdateEvent },
  heading = mode === "edit" ? "Edit event" : "Create event",
  onCreated = (saved: EventSummaryRow) =>
    window.location.assign(`/organizer/events/${saved.id}`),
}: {
  mode?: "create" | "edit";
  /** Required when `mode` is "edit": what the fields start out holding. */
  event?: EventSummaryRow;
  client?: CreateEventClient;
  /** null where a surrounding control already names the form, e.g. a <summary>. */
  heading?: string | null;
  onCreated?: (event: EventSummaryRow) => void;
}) {
  const editing = mode === "edit";

  // Two zones, and they are not the same question. `hostZone` is where the
  // person typing is sitting, which is the only zone the datetime boxes can be
  // showing. `eventZone` is the zone the event is filed under — derived, never
  // held in state, because there is nowhere sensible to put a zone picker on
  // this screen and every organizer we have runs rooms in the city they are in.
  // A stored zone wins there, or an event created in Bogotá would silently be
  // refiled the first time it was edited from a laptop in Madrid. Only
  // `eventZone` goes in the request body; only `hostZone` is ever shown.
  const hostZone = useSyncExternalStore(
    NEVER_CHANGES,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    EMPTY_ON_SERVER,
  );
  const eventZone = event?.timezone ?? hostZone;
  // The chip's text goes through its own snapshot rather than being rendered
  // straight from `hostZone`: the abbreviation comes out of the locale data of
  // whoever formats it, and the server's ICU build is not the browser's. An
  // empty server snapshot means there is nothing there to mismatch, and the
  // chip is a reminder for the person typing, so the client is where it belongs.
  const zoneChip = useSyncExternalStore(
    NEVER_CHANGES,
    () => (hostZone ? zoneLabel(hostZone) : ""),
    EMPTY_ON_SERVER,
  );

  // Same story for the two datetime boxes in edit mode: rendering a stored
  // instant as wall-clock time reads the host's zone, so the server has to be
  // given its own empty snapshot rather than a time in the server's zone. The
  // `null` overrides below mean "untouched" — the moment either is typed in,
  // the typed value wins and the derived one stops mattering.
  const storedStartsAt = useSyncExternalStore(
    NEVER_CHANGES,
    () => toLocalInput(event?.starts_at),
    EMPTY_ON_SERVER,
  );
  const storedEndsAt = useSyncExternalStore(
    NEVER_CHANGES,
    () => toLocalInput(event?.ends_at),
    EMPTY_ON_SERVER,
  );

  const [name, setName] = useState(editing ? event?.name ?? "" : "");
  const [typedStartsAt, setStartsAt] = useState<string | null>(null);
  const [typedEndsAt, setEndsAt] = useState<string | null>(null);
  const startsAt = typedStartsAt ?? storedStartsAt;
  const endsAt = typedEndsAt ?? storedEndsAt;
  const [location, setLocation] = useState(
    editing ? event?.location ?? "" : "",
  );
  const [description, setDescription] = useState(
    editing ? event?.description ?? "" : "",
  );
  const [capacity, setCapacity] = useState(
    editing && event?.capacity ? String(event.capacity) : "",
  );
  const [groupSize, setGroupSize] = useState<number>(
    editing ? event?.group_size_target ?? 5 : 5,
  );
  const [error, setError] = useState<CreateErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const endsRef = useRef<HTMLInputElement>(null);
  const capacityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error === "name") nameRef.current?.focus();
    if (error === "ends_at") endsRef.current?.focus();
    if (error === "capacity") capacityRef.current?.focus();
  }, [error]);

  /** Which field the browser-side schema rejected, so focus can land on it. */
  function codeFor(path: PropertyKey | undefined): CreateErrorCode {
    if (path === "ends_at") return "ends_at";
    if (path === "capacity") return "capacity";
    return "name";
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    // There is no DELETE on events, so a duplicate from a double-click is
    // permanent. In edit mode the same guard keeps two PATCHes from racing.
    if (inFlight.current) return;

    // The datetime-local boxes report local wall-clock time. Converting to an
    // instant here means the backend stores the moment the organizer meant
    // rather than a string whose timezone depends on who typed it.
    const detail = {
      starts_at: toInstant(startsAt),
      ends_at: toInstant(endsAt),
      timezone: eventZone || null,
      location: location.trim() || null,
      description: description.trim() || null,
      // "" is unlimited, not a room with no seats in it.
      capacity: capacity.trim() === "" ? null : Number(capacity),
    };

    // Which call to make is settled before anything is sent, so the request
    // below has no branch in it and neither body needs widening to fit both.
    let send: () => Promise<EventSummaryRow>;
    if (editing) {
      if (!event) return;
      const parsed = eventUpdateSchema.safeParse({ name, ...detail });
      if (!parsed.success) {
        setError(codeFor(parsed.error.issues[0]?.path[0]));
        return;
      }
      const body = parsed.data;
      send = () => client.updateEvent(event.id, body);
    } else {
      const parsed = eventCreateSchema.safeParse({
        name,
        group_size_target: groupSize,
        ...detail,
      });
      if (!parsed.success) {
        setError(codeFor(parsed.error.issues[0]?.path[0]));
        return;
      }
      const body = parsed.data;
      send = () => client.createEvent(body);
    }

    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await send());
    } catch (reason) {
      if (reason instanceof DashboardClientError) {
        if (reason.code === "unauthorized") {
          window.location.assign("/organizer/login");
          return;
        }
        if (reason.code === "conflict") {
          setError("conflict");
          return;
        }
      }
      setError("unavailable");
    } finally {
      // Nothing is cleared: a failure leaves every field exactly as typed.
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.createPanes} noValidate onSubmit={submit}>
      {/* The wait is long enough to need covering: the request is followed by a
          full page load, and the button alone left a second or more of silence
          at the moment a first-timer is least sure anything worked. */}
      <SavingOverlay
        active={submitting}
        message={
          editing ? "Saving your changes…" : "Setting up your evening…"
        }
      />
      <section className={styles.createMain}>
        {heading ? (
          <header className={styles.createHead}>
            <h2>{heading}</h2>
          </header>
        ) : null}

        <input
          aria-label="Event name"
          autoComplete="off"
          className={styles.createTitle}
          disabled={submitting}
          name="name"
          onChange={(changed) => { setName(changed.target.value); setError(null); }}
          placeholder="Untitled event"
          ref={nameRef}
          type="text"
          value={name}
        />

        <section className={styles.createSection}>
          <h3>Date and location</h3>
          <p className={styles.caption}>Visible to anyone who opens this event.</p>
          {/* Start, end and zone read as one control because they answer one
              question, so they share a border instead of each having their own. */}
          <div className={styles.createWhen}>
            {/* Named on screen, not only to a screen reader. Two identical
                dd/mm/yyyy boxes sharing a border gave a sighted organizer
                nothing but left-to-right order to go on, and the end time is
                the optional one — the field most worth being able to skip
                knowingly rather than by accident. */}
            <label className={styles.createWhenSlot}>
              <span className={styles.createWhenLabel}>Starts</span>
              <input
                className={styles.createWhenField}
                disabled={submitting}
                name="starts_at"
                onChange={(changed) => setStartsAt(changed.target.value)}
                type="datetime-local"
                value={startsAt}
              />
            </label>
            <label className={styles.createWhenSlot}>
              <span className={styles.createWhenLabel}>Ends</span>
              <input
                className={styles.createWhenField}
                disabled={submitting}
                name="ends_at"
                onChange={(changed) => {
                  setEndsAt(changed.target.value);
                  setError(null);
                }}
                ref={endsRef}
                type="datetime-local"
                value={endsAt}
              />
            </label>
            {/* Names `hostZone`, not the event's: the boxes to its left are
                showing the viewer's wall-clock, and a chip that named the
                stored zone would be inviting the viewer to "correct" a time
                that was never wrong. */}
            {zoneChip ? (
              <span
                aria-label={hostZone}
                className={styles.createZone}
                title={hostZone}
              >
                {zoneChip}
              </span>
            ) : null}
          </div>
          <input
            aria-label="Location"
            autoComplete="off"
            className={styles.createInput}
            disabled={submitting}
            name="location"
            onChange={(changed) => setLocation(changed.target.value)}
            placeholder="Where is it?"
            type="text"
            value={location}
          />
        </section>

        <section className={styles.createSection}>
          <h3>Description</h3>
          <p className={styles.caption}>
            What guests see before they fill anything in.
          </p>
          <textarea
            aria-label="Description"
            className={styles.createTextarea}
            disabled={submitting}
            name="description"
            onChange={(changed) => setDescription(changed.target.value)}
            placeholder="What is this evening for?"
            value={description}
          />
        </section>

        {error ? (
          <p className={styles.createError} role="alert">{ERRORS[error]}</p>
        ) : null}

        <div className={styles.createActions}>
          <button className={styles.primary} disabled={submitting} type="submit">
            {submitting
              ? "Saving…"
              : editing
                ? "Save changes"
                : "Create event"}
          </button>
        </div>
      </section>

      <aside className={styles.createRail}>
        <h2>Settings</h2>
        <p className={styles.caption}>How guests are matched and seated.</p>

        <fieldset
          className={styles.createSizes}
          disabled={submitting || editing}
        >
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
            {editing
              ? "Table size is fixed once an event exists."
              : `Tables of ${groupSize}. This can't be changed once the event exists.`}
          </p>
        </fieldset>

        <label className={styles.createRailField}>
          <span>Capacity</span>
          <input
            className={styles.createInput}
            disabled={submitting}
            min={1}
            name="capacity"
            onChange={(changed) => {
              setCapacity(changed.target.value);
              setError(null);
            }}
            placeholder="Unlimited"
            ref={capacityRef}
            type="number"
            value={capacity}
          />
          <p className={styles.createHint}>
            Leave it empty and the guest form stays open.
          </p>
        </label>
      </aside>
    </form>
  );
}
