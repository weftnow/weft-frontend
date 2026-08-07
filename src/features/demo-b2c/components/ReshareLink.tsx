"use client";

import { useRef, useState } from "react";
import { postInvite } from "@/features/demo-b2c/api/client/mintInvite";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { ShareLink } from "@/features/demo-b2c/components/ShareLink";
import { PremiumButton } from "@/components/ui/PremiumButton";

const TIMEOUT_MS = 8000;

/**
 * A fresh share link, on request.
 *
 * Minted by the click rather than by the render: this page is a GET someone
 * may refresh a dozen times while they wait, and minting on render would spend
 * a token on each one. Invites are cheap, but not free of meaning -- each is a
 * live capability with a thirty-day life.
 *
 * The in-flight guard is a ref, not state: a state update does not land before
 * a second click can arrive, and two clicks would mint two tokens.
 */
export function ReshareLink() {
  const copy = demoB2cContent.matches.waiting;
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function mint() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(false);

    try {
      const response = await postInvite(AbortSignal.timeout(TIMEOUT_MS));
      const body = (await response.json().catch(() => null)) as { token?: string } | null;
      if (response.ok && body?.token) setToken(body.token);
      else setFailed(true);
    } catch {
      // Offline, or the request never landed. Nothing was created.
      setFailed(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (token) return <ShareLink token={token} />;

  return (
    <div className="mt-8 flex flex-col items-center">
      <PremiumButton tone="ember" onClick={mint} disabled={busy}>
        {copy.cta}
      </PremiumButton>
      {failed && (
        <p className="ctest-error" role="alert">
          {copy.failed}
        </p>
      )}
    </div>
  );
}
