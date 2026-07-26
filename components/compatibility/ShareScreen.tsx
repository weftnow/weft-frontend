"use client";

import { content } from "@/content";
import { ShareLink } from "@/components/compatibility/ShareLink";

/**
 * Everything an originator gets: a link, and the reason to send it. No profile
 * and no score -- those only exist once a second person has answered.
 */
export function ShareScreen({
  shareToken,
  onRestart,
}: {
  shareToken: string;
  onRestart: () => void;
}) {
  const copy = content.compatibilityTest.share;

  return (
    <div className="relative z-10 flex w-full flex-col items-center text-center">
      <span className="ctest-eyebrow">{copy.eyebrow}</span>
      <h2 className="ctest-prompt">{copy.headline}</h2>
      <p className="mt-3 max-w-md text-pretty text-base leading-relaxed text-ink/62">
        {copy.sub}
      </p>

      <ShareLink
        token={shareToken}
        secondary={
          <button
            className="font-mono text-xs uppercase tracking-wider text-ink/50 transition-colors hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal"
            onClick={onRestart}
            type="button"
          >
            {copy.restart}
          </button>
        }
      />

      <p className="mt-2 max-w-sm font-mono text-[0.68rem] leading-relaxed text-ink/45">
        {copy.note}
      </p>
    </div>
  );
}
