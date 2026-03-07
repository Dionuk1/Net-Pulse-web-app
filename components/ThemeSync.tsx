"use client";

import { useEffect } from "react";
import useSettings from "@/lib/useSettings";

export default function ThemeSync() {
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.language;
  }, [settings.language, settings.theme]);

  return null;
}
