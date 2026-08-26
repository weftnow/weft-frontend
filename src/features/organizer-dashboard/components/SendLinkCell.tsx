"use client";

import { useState } from "react";
import { attendeeLinkUrl, waMeUrl } from "../model/whatsapp.model";
import styles from "./Dashboard.module.css";

/**
 * One guest's send button.
 *
 * A client component because the link is built against whatever origin the
 * dashboard is actually being served from — the backend cannot know it, and
 * baking it into an env var is one more way to deploy a link that goes
 * nowhere.
 */
export function SendLinkCell({ phone, linkToken }: { phone: string | null; linkToken: string }) {
  const [copied, setCopied] = useState(false);
  const url = attendeeLinkUrl(typeof window === "undefined" ? "" : window.location.origin, linkToken);
  const wa = waMeUrl(phone, url);

  if (wa) {
    return (
      <a className={styles.secondaryAction} href={wa} rel="noreferrer" target="_blank">
        WhatsApp
      </a>
    );
  }
  return (
    <button
      className={styles.secondaryAction}
      onClick={() => {
        void navigator.clipboard.writeText(url).then(() => setCopied(true));
      }}
      type="button"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
