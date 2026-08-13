"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { groupRevealClient, type GroupRevealClient } from "../api/groupReveal.api";
import { countdownRemainingMs } from "../model/groupReveal.model";
import type { GroupReveal } from "../schemas/groupReveal.schema";

export function useGroupReveal(formToken: string, client: GroupRevealClient = groupRevealClient) {
  const [group, setGroup] = useState<GroupReveal>();
  const [error, setError] = useState(false);
  const [confirmationError, setConfirmationError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(Date.now());
  const receivedAt = useRef<number | undefined>(undefined);
  const inFlight = useRef(false);
  const retryDelay = useRef(2_000);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    if (inFlight.current || document.visibilityState === "hidden") return;
    inFlight.current = true;
    try {
      const result = await client.load(formToken);
      if (result.status === "ready") {
        receivedAt.current = Date.now();
        setGroup(result.group);
      }
      retryDelay.current = 2_000;
      setError(false);
    } catch {
      setError(true);
      retryDelay.current = Math.min(retryDelay.current * 2, 16_000);
    } finally {
      inFlight.current = false;
    }
  }, [client, formToken]);

  useEffect(() => {
    let disposed = false;
    const schedule = () => {
      if (disposed || document.visibilityState === "hidden") return;
      timer.current = setTimeout(async () => {
        await load();
        schedule();
      }, retryDelay.current);
    };
    const resume = () => {
      if (document.visibilityState !== "hidden") {
        void load().then(schedule);
      }
    };
    void load().then(schedule);
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  const remaining = group && receivedAt.current
    ? countdownRemainingMs(group.reveal_at, group.server_time, receivedAt.current, now)
    : 0;
  const confirm = async () => {
    if (confirming) return;
    setConfirming(true);
    setConfirmationError(false);
    try {
      await client.confirm(formToken);
      setGroup(value => value && { ...value, confirmed: true });
    } catch {
      setConfirmationError(true);
    } finally {
      setConfirming(false);
    }
  };
  return { group, error, confirmationError, confirming, remaining, retry: load, confirm };
}
