"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { content } from "@/content";
import { PremiumButton } from "@/components/ui/PremiumButton";

const COPIED_MS = 2000;

// The origin never changes for the life of the document, so nothing ever
// notifies -- but subscribe must be referentially stable.
const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const readOriginOnServer = () => "";

/**
 * Everything an originator gets: a link, and the reason to send it. No profile
 * and no score -- those only exist once a second person has answered.
 *
 * The link's shape is the frontend's to own, so it is built here from the
 * token rather than taken from the backend's placeholder share URL.
 */
export function ShareScreen({
  shareToken,
  onRestart,
}: {
  shareToken: string;
  onRestart: () => void;
}) {
  const copy = content.compatibilityTest.share;
  // Only knowable in the browser, so the server-rendered markup carries a
  // relative link and the absolute one fills in on hydration.
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readOriginOnServer);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const path = `/compatibility-test/invite/${shareToken}`;
  const shareUrl = `${origin}${path}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard unavailable -- the link stays on screen to copy by hand.
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <div className="relative z-10 flex w-full flex-col items-center text-center">
      <span className="ctest-eyebrow">{copy.eyebrow}</span>
      <h2 className="ctest-prompt">{copy.headline}</h2>
      <p className="mt-3 max-w-md text-pretty text-base leading-relaxed text-ink/62">
        {copy.sub}
      </p>

      <p className="ctest-linkbox mt-7">{shareUrl.replace(/^https?:\/\//, "")}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <PremiumButton onClick={copyLink} tone="ember">
          {copied ? copy.copied : copy.copy}
        </PremiumButton>
        <button
          className="font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
          onClick={onRestart}
          type="button"
        >
          {copy.restart}
        </button>
      </div>

      <p aria-live="polite" className="ctest-copied mt-4 h-4">
        {copied ? copy.announce : ""}
      </p>
      <p className="mt-2 max-w-sm font-mono text-[0.68rem] leading-relaxed text-ink/45">
        {copy.note}
      </p>
    </div>
  );
}
