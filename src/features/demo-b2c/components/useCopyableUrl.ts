"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const COPIED_MS = 2000;

// The origin never changes for the life of the document, so nothing ever
// notifies -- but subscribe must be referentially stable.
const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const readOriginOnServer = () => "";

export type CopyableUrl = {
  /** The absolute URL, once the host is known. */
  url: string;
  /** The same URL without its scheme -- what a person reads off the screen. */
  display: string;
  copied: boolean;
  copy: () => Promise<void>;
};

/**
 * A path turned into something a visitor can take with them: an absolute URL
 * to show, and a clipboard write that says so afterwards.
 *
 * Shared by every link this product asks someone to keep, so that a second one
 * cannot quietly ship without the copy affordance -- a link a visitor must tap
 * to read is a link they lose, because tapping it navigates the page that was
 * showing it away.
 *
 * `window.location.origin` is only readable after mount, so the
 * server-rendered markup carries the path alone and the host fills in on
 * hydration.
 */
export function useCopyableUrl(path: string): CopyableUrl {
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readOriginOnServer);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard unavailable -- the link stays on screen to copy by hand.
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return { url, display: url.replace(/^https?:\/\//, ""), copied, copy };
}
