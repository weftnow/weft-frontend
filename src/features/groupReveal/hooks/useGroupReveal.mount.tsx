"use client";
import { useGroupReveal } from "./useGroupReveal";
import type { GroupRevealClient } from "../api/groupReveal.api";
export function GroupRevealProbe({ client }: { client: GroupRevealClient }) { const state = useGroupReveal("token-valid-123456", client); return <output data-testid="state">{state.group?.confirmed ? "confirmed" : state.group ? "ready" : state.error ? "error" : "waiting"}</output>; }
