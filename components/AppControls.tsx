"use client";

import { Moon, Sun } from "lucide-react";
import useSettings from "@/lib/useSettings";
import { languageLabel, translations } from "@/lib/i18n";

export default function AppControls() {
  const { settings, updateSettings } = useSettings();
  const t = translations[settings.language];

  return (
    <div className="print-hide mb-4 flex flex-wrap items-center justify-end gap-2">
      <label className="flex items-center gap-2 rounded-xl border border-[color:var(--np-border)] bg-[color:var(--np-card)] px-3 py-2 text-xs text-[color:var(--np-muted)]">
        {t.language}
        <select
          value={settings.language}
          onChange={(event) => updateSettings({ language: event.target.value as "en" | "sq" })}
          className="rounded-md border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-2 py-1 text-xs text-[color:var(--np-text)]"
          aria-label={t.language}
        >
          <option value="en">{languageLabel.en}</option>
          <option value="sq">{languageLabel.sq}</option>
        </select>
      </label>

      <button
        type="button"
        onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
        className="flex items-center gap-2 rounded-xl border border-[color:var(--np-border)] bg-[color:var(--np-card)] px-3 py-2 text-xs text-[color:var(--np-text)] transition hover:bg-[color:var(--np-surface)]"
        aria-label={settings.theme === "dark" ? t.lightMode : t.darkMode}
      >
        {settings.theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        <span>{settings.theme === "dark" ? t.lightMode : t.darkMode}</span>
      </button>
    </div>
  );
}
