"use client";

import useSettings from "@/lib/useSettings";
import { translations } from "@/lib/i18n";

export default function useI18n() {
  const { settings } = useSettings();
  return translations[settings.language];
}
