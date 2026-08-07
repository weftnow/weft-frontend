"use client";

import { useRef, useState } from "react";
import { postInvite } from "@/features/demo-b2c/api/client/mintInvite";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { ReturnLink } from "@/features/demo-b2c/components/ReturnLink";
import { ShareLink } from "@/features/demo-b2c/components/ShareLink";
import { PremiumButton } from "@/components/ui/PremiumButton";

const TIMEOUT_MS = 8000;

/**
 * What a fresh mint hands back. Split out so this state renders in a test
 * without driving a click and a fetch through a DOM.
 *
 * A second invite is a second thread: it produces pairs of its own, reachable
 * by its own return token. Showing the invite alone would leave whoever answers
 * it findable only through the cookie -- and this page is where a sender goes
 * precisely because their result is not where they left it.
 */
export function MintedLinks({
  token,
  returnToken,
}: {
  token: string;
  returnToken: string;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <ShareLink token={token} />
      <ReturnLink token={returnToken} />
    </div>
  );
}

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
  const [minted, setMinted] = useState<{ token: string; returnToken: string } | null>(null);
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
      const body = (await response.json().catch(() => null)) as
        | { token?: string; return_token?: string }
        | null;
      // `/api/invite` answers with both tokens or an error status, so this is
      // a shape check on an untyped body rather than a tolerated half-success:
      // a fresh invite whose return link never reaches the sender is the exact
      // loss the return link exists to prevent.
      if (response.ok && body?.token && body.return_token) {
        setMinted({ token: body.token, returnToken: body.return_token });
      } else setFailed(true);
    } catch {
      // Offline, or the request never landed. Nothing was created.
      setFailed(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (minted) return <MintedLinks token={minted.token} returnToken={minted.returnToken} />;

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
