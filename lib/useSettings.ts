"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, readSettings, saveSettings, type AppSettings } from "@/lib/settings";

export default function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const sync = () => setSettings(readSettings());
    const syncOnMount = () => queueMicrotask(sync);
    const syncAsync = () => {
      if (typeof window !== "undefined") {
        queueMicrotask(sync);
      }
    };

    syncOnMount();

    window.addEventListener("storage", syncAsync);
    window.addEventListener("netpulse:settings-updated", syncAsync as EventListener);

    return () => {
      window.removeEventListener("storage", syncAsync);
      window.removeEventListener("netpulse:settings-updated", syncAsync as EventListener);
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
