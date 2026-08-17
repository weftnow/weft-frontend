"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GroupRevealLoadError, groupRevealClient, type GroupRevealClient, type GroupRevealLoadErrorKind } from "../api/groupReveal.api";
import { countdownRemainingMs } from "../model/groupReveal.model";
import type { GroupReveal } from "../schemas/groupReveal.schema";

export function useGroupReveal(formToken: string, client: GroupRevealClient = groupRevealClient) {
  const [group, setGroup] = useState<GroupReveal>();
  const [error, setError] = useState<GroupRevealLoadErrorKind | null>(null);
  const [confirmationError, setConfirmationError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [receivedAt, setReceivedAt] = useState<number>();
  const inFlight = useRef(false);
  const retryDelay = useRef(2_000);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    if (inFlight.current || document.visibilityState === "hidden") return;
    inFlight.current = true;
    try {
      const result = await client.load(formToken);
      if (result.status === "ready") {
        setReceivedAt(Date.now());
        setGroup(result.group);
      }
      retryDelay.current = 2_000;
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof GroupRevealLoadError
          ? loadError.kind
          : "unavailable",
      );
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
    timer.current = setTimeout(async () => {
      await load();
      schedule();
    }, 0);
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  const remaining = group && receivedAt
    ? countdownRemainingMs(group.reveal_at, group.server_time, receivedAt, now)
    : 0;
  // Reports whether the confirmation landed. The reveal has one button that
  // both confirms and moves on, so its handler needs the outcome to decide
  // between navigating now and showing the retry line first.
  const confirm = async (): Promise<boolean> => {
    if (confirming) return false;
    setConfirming(true);
    setConfirmationError(false);
    try {
      await client.confirm(formToken);
      setGroup(value => value && { ...value, confirmed: true });
      return true;
    } catch {
      setConfirmationError(true);
      return false;
    } finally {
      setConfirming(false);
    }
  };
  return { group, error, confirmationError, confirming, remaining, retry: load, confirm };
}
