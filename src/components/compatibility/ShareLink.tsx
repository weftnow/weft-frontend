"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { content } from "@/content";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { inviteHref } from "@/lib/links";

const COPIED_MS = 2000;

// The origin never changes for the life of the document, so nothing ever
// notifies -- but subscribe must be referentially stable.
const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const readOriginOnServer = () => "";

/**
 * A share token, rendered as a link someone can copy. The link's shape is the
 * frontend's to own, so it is built from the token rather than taken from the
 * backend's placeholder share URL. `window.location.origin` is only readable
 * after mount, so the server-rendered markup carries the path alone and the
 * host fills in on hydration.
 */
export function ShareLink({
  token,
  secondary,
}: {
  token: string;
  secondary?: ReactNode;
}) {
  const copy = content.compatibilityTest.share;
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readOriginOnServer);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const shareUrl = `${origin}${inviteHref(token)}`;

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
    <div className="flex w-full flex-col items-center">
      <div className="ctest-linkcard mt-7">
        <span className="ctest-linkcard-label">{copy.linkLabel}</span>
        <p className="ctest-linkcard-url">{shareUrl.replace(/^https?:\/\//, "")}</p>
        <div className="ctest-linkcard-actions">
          <PremiumButton hand={false} onClick={copyLink} tone="ember">
            {copied ? copy.copied : copy.copy}
          </PremiumButton>
        </div>
      </div>
      {secondary && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">{secondary}</div>
      )}
      <p aria-live="polite" className="ctest-copied mt-4 h-4">
        {copied ? copy.announce : ""}
      </p>
    </div>
  );
}
