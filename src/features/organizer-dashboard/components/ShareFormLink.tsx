"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./Dashboard.module.css";

const COPIED_FOR_MS = 2_000;

/**
 * The link an organizer sends to their guests.
 *
 * Creating an event is pointless without this: the questionnaire at
 * /questionnaire/{form_token} is the only way anyone gets into the room, and
 * until now the token never left the API.
 *
 * The absolute URL is assembled on the client. There is no NEXT_PUBLIC_SITE_URL
 * in this project, and the origin the organizer is already browsing is the
 * right one by construction.
 *
 * useSyncExternalStore rather than an effect that setStates: location is
 * exactly the "value that lives outside React" this hook exists for, it gives
 * the server its own snapshot so hydration stays quiet, and it avoids the
 * cascading render an effect would cost. The origin cannot change without a
 * page load, so subscribe is a no-op. Before hydration the href is the relative
 * path, which still works if clicked.
 */
const NEVER_CHANGES = () => () => {};

export function ShareFormLink({ formToken }: { formToken: string }) {
  const path = `/questionnaire/${formToken}`;
  const origin = useSyncExternalStore(
    NEVER_CHANGES,
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Denied outside a secure context, and in some browsers by policy. The
      // URL is rendered as selectable text for exactly this case, so there is
      // nothing to announce — claiming "Copied" when nothing was copied is
      // worse than staying quiet.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_FOR_MS);
  }

  return (
    /*
      A tinted band rather than one more white card. While an event is open
      this is the only thing on screen there is anything to *do* about, and
      dressed like the read-only statistics beside it, it gets skipped.
    */
    <section className={styles.shareBand}>
      <h2>Share this link with your guests</h2>
      <p className={styles.caption}>
        Everyone who fills this in gets sorted into a table.
      </p>
      <div className={styles.shareRow}>
        <a className={styles.shareUrl} href={url} rel="noreferrer" target="_blank">
          {url}
        </a>
        {/*
          aria-live because the confirmation *is* the label changing. A sighted
          organizer reads that directly; without the live region a screen reader
          user gets no feedback that the copy worked at all.
        */}
        <button
          aria-live="polite"
          className={styles.shareCopy}
          onClick={copy}
          type="button"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </section>
  );
}
