"use client";

import { type ReactNode } from "react";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { useCopyableUrl } from "@/features/demo-b2c/components/useCopyableUrl";
import { inviteHref } from "@/features/demo-b2c/model/links";

/**
 * A share token, rendered as a link someone can copy. The link's shape is the
 * frontend's to own, so it is built from the token rather than taken from the
 * backend's placeholder share URL.
 */
export function ShareLink({
  token,
  secondary,
}: {
  token: string;
  secondary?: ReactNode;
}) {
  const copy = demoB2cContent.share;
  const link = useCopyableUrl(inviteHref(token));

  return (
    <div className="flex w-full flex-col items-center">
      <div className="ctest-linkcard mt-7">
        <span className="ctest-linkcard-label">{copy.linkLabel}</span>
        <p className="ctest-linkcard-url">{link.display}</p>
        <div className="ctest-linkcard-actions">
          <PremiumButton hand={false} onClick={link.copy} tone="ember">
            {link.copied ? copy.copied : copy.copy}
          </PremiumButton>
        </div>
      </div>
      {secondary && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">{secondary}</div>
      )}
      <p aria-live="polite" className="ctest-copied mt-4 h-4">
        {link.copied ? copy.announce : ""}
      </p>
    </div>
  );
}
