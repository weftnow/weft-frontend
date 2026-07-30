"use client";

import { content } from "@/content";
import { useCopyableUrl } from "@/components/compatibility/useCopyableUrl";
import { threadHref } from "@/lib/links";

/**
 * The sender's way back to their own result, shown so they can keep it.
 *
 * Deliberately not a link they follow. Following it would leave the screen
 * that is holding the invite token -- which lives only in this browser's
 * memory and is listed nowhere -- so a tap to "save" would destroy the thing
 * they were told to send. The URL is printed and copyable instead: saving it
 * costs no navigation.
 *
 * Quieter than `ShareLink` on purpose. Both are secrets, but only one is meant
 * to be handed to another person; a sender who copies this one by mistake
 * gives a stranger their permanent private result page.
 */
export function ReturnLink({ token }: { token: string }) {
  const copy = content.compatibilityTest.share;
  const link = useCopyableUrl(threadHref(token));

  return (
    <div className="ctest-returnlink">
      <span className="ctest-returnlink-label">{copy.returnLink}</span>
      <p className="ctest-returnlink-url">{link.display}</p>
      <button className="ctest-returnlink-copy" onClick={link.copy} type="button">
        {link.copied ? copy.copied : copy.returnCopy}
      </button>
      <p className="ctest-returnlink-hint">{copy.returnHint}</p>
      <p aria-live="polite" className="ctest-copied h-4">
        {link.copied ? copy.returnAnnounce : ""}
      </p>
    </div>
  );
}
