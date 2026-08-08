"use client";

import { useEffect, useState } from "react";

export function remainingMilliseconds(deadline: string | null, now: number) {
  return deadline ? Math.max(0, Date.parse(deadline) - now) : 0;
}

export function formatCountdown(milliseconds: number) {
  const total = Math.ceil(Math.max(0, milliseconds) / 1_000);
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" +
    String(total % 60).padStart(2, "0");
}

export function useCountdown(timerEndsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [timerEndsAt]);
  return remainingMilliseconds(timerEndsAt, now);
}
