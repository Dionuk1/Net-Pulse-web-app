"use client";

import Card from "@/components/Card";
import { languageLabel } from "@/lib/i18n";
import useI18n from "@/lib/useI18n";
import useSettings from "@/lib/useSettings";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const t = useI18n();

  return (
    <main className="space-y-5 pb-4 md:space-y-6 md:pb-8">
      <header className="pt-2 text-center md:text-left">
        <h1 className="text-[40px] font-bold text-white sm:text-[34px]">{t.settingsTitle}</h1>
        <p className="text-sm text-white/60">Functional controls only: scan behavior, filters, and appearance.</p>
      </header>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4 md:max-w-3xl">
        <h2 className="text-lg font-semibold text-white">{t.monitoring}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-white/80">
            Scan Mode
            <select
              value={settings.autoScanEnabled ? "interval" : "manual"}
              onChange={(event) => updateSettings({ autoScanEnabled: event.target.value === "interval" })}
              className="mt-1 block w-full rounded-lg border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-2 py-2 text-sm text-white"
            >
              <option value="manual">Manual only</option>
              <option value="interval">Interval-based</option>
            </select>
          </label>

          <label className="text-sm text-white/80">
            Scan Interval
            <select
              value={settings.scanIntervalMinutes}
              onChange={(event) => updateSettings({ scanIntervalMinutes: Number(event.target.value) as 2 | 3 | 5 })}
              disabled={!settings.autoScanEnabled}
              className="mt-1 block w-full rounded-lg border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-2 py-2 text-sm text-white disabled:opacity-50"
            >
              <option value={2}>Every 2 minutes</option>
              <option value={3}>Every 3 minutes</option>
              <option value={5}>Every 5 minutes</option>
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={settings.showOfflineDevices}
            onChange={(event) => updateSettings({ showOfflineDevices: event.target.checked })}
            className="h-4 w-4 rounded border-[color:var(--np-border)] bg-[color:var(--np-surface)]"
          />
          Show offline devices in scanner/activity views
        </label>
      </Card>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4 md:max-w-3xl">
        <h2 className="text-lg font-semibold text-white">{t.appearance}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-white/80">
            {t.language}
            <select
              value={settings.language}
              onChange={(event) => updateSettings({ language: event.target.value as "en" | "sq" })}
              className="mt-1 block w-full rounded-lg border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-2 py-2 text-sm text-white"
            >
              <option value="en">{languageLabel.en}</option>
              <option value="sq">{languageLabel.sq}</option>
            </select>
          </label>

          <label className="text-sm text-white/80">
            {t.theme}
            <select
              value={settings.theme}
              onChange={(event) => updateSettings({ theme: event.target.value as "dark" | "light" })}
              className="mt-1 block w-full rounded-lg border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-2 py-2 text-sm text-white"
            >
              <option value="dark">{t.darkMode}</option>
              <option value="light">{t.lightMode}</option>
            </select>
          </label>
        </div>
      </Card>
    </main>
  );
}
