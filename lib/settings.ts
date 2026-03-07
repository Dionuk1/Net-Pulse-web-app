export type AppSettings = {
  autoScanEnabled: boolean;
  scanIntervalMinutes: 2 | 3 | 5;
  showOfflineDevices: boolean;
  theme: "dark" | "light";
  language: "en" | "sq";
};

export const DEFAULT_SETTINGS: AppSettings = {
  autoScanEnabled: false,
  scanIntervalMinutes: 3,
  showOfflineDevices: true,
  theme: "dark",
  language: "en",
};

const SETTINGS_KEY = "netpulse:settings";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readSettings(): AppSettings {
  if (!canUseStorage()) {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const autoScanEnabled = parsed.autoScanEnabled ?? DEFAULT_SETTINGS.autoScanEnabled;
    const showOfflineDevices = parsed.showOfflineDevices ?? DEFAULT_SETTINGS.showOfflineDevices;
    const scanIntervalMinutes =
      parsed.scanIntervalMinutes === 2 || parsed.scanIntervalMinutes === 3 || parsed.scanIntervalMinutes === 5
        ? parsed.scanIntervalMinutes
        : DEFAULT_SETTINGS.scanIntervalMinutes;
    const theme = parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : DEFAULT_SETTINGS.theme;
    const language = parsed.language === "sq" || parsed.language === "en" ? parsed.language : DEFAULT_SETTINGS.language;

    return {
      autoScanEnabled,
      scanIntervalMinutes,
      showOfflineDevices,
      theme,
      language,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setTimeout(() => window.dispatchEvent(new Event("netpulse:settings-updated")), 0);
  } catch {
    // ignore storage failures
  }
}

export function getPollingIntervalMs(settings: AppSettings): number {
  if (!settings.autoScanEnabled) {
    return 0;
  }
  return settings.scanIntervalMinutes * 60 * 1000;
}
