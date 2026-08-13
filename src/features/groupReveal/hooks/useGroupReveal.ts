"use client";
import { useCallback, useEffect, useState } from "react";
import { groupRevealClient, type GroupRevealClient } from "../api/groupReveal.api";
import { countdownRemainingMs } from "../model/groupReveal.model";
import type { GroupReveal } from "../schemas/groupReveal.schema";

export function useGroupReveal(formToken: string, client: GroupRevealClient = groupRevealClient) {
  const [group, setGroup] = useState<GroupReveal>(); const [error, setError] = useState(false); const [now, setNow] = useState(Date.now());
  const load = useCallback(async () => { try { const result = await client.load(formToken); if (result.status === "ready") setGroup(result.group); setError(false); } catch { setError(true); } }, [client, formToken]);
  useEffect(() => { void load(); const id = setInterval(() => void load(), 2_000); return () => clearInterval(id); }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  const remaining = group ? countdownRemainingMs(group.reveal_at, group.server_time, now, now) : 0;
  const confirm = async () => { await client.confirm(formToken); setGroup(value => value && { ...value, confirmed: true }); };
  return { group, error, remaining, retry: load, confirm };
}
