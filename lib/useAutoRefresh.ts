"use client";

import { useEffect, useRef } from "react";

export default function useAutoRefresh(
  callback: () => void | Promise<void>,
  intervalMs: number,
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalMs <= 0) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = () => {
      clearTimer();
      if (!active || document.hidden) {
        return;
      }
      timer = setTimeout(async () => {
        await callbackRef.current();
        schedule();
      }, intervalMs);
    };

    const handleVisibilityChange = () => {
      if (!active) {
        return;
      }

      if (document.hidden) {
        clearTimer();
        return;
      }

      void callbackRef.current();
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs]);
}
