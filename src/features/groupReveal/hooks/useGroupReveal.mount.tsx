"use client";
import { useGroupReveal } from "./useGroupReveal";
import type { GroupRevealClient } from "../api/groupReveal.api";

export function GroupRevealProbe({ client }: { client: GroupRevealClient }) {
  const state = useGroupReveal("token-valid-123456", client);
  const stateLabel = state.error ?? (state.group?.confirmed ? "confirmed" : state.group ? "ready" : "waiting");

  return <>
    <output data-testid="state">{stateLabel}</output>
    <button type="button" data-testid="retry" onClick={() => { void state.retry(); }}>retry</button>
  </>;
}
