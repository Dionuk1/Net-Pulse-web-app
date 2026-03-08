export const SUPPORTED_LANGUAGES = ["en", "sq"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const languageLabel: Record<AppLanguage, string> = {
  en: "English",
  sq: "Shqip",
};

type TranslationMap = {
  navHome: string;
  navDevices: string;
  navActivity: string;  navSpeed: string;
  navTerminal: string;
  navSettings: string;
  navigation: string;
  homeTitle: string;
  dashboardTitle: string;
  refresh: string;
  wifiTrustScore: string;
  generateReport: string;
  live: string;
  offlineFallback: string;
  loadingNetworkDetails: string;
  lastUpdated: string;
  settingsTitle: string;
  monitoring: string;
  appearance: string;
  language: string;
  theme: string;
  darkMode: string;
  lightMode: string;
  about: string;
  scanInterval: string;
  notifications: string;
};

export const translations: Record<AppLanguage, TranslationMap> = {
  en: {
    navHome: "Home",
    navDevices: "Devices",
    navActivity: "Activity",    navSpeed: "Speed",
    navTerminal: "Terminal",
    navSettings: "Settings",
    navigation: "Navigation",
    homeTitle: "NetPulse",
    dashboardTitle: "Network Dashboard",
    refresh: "Refresh",
    wifiTrustScore: "Wi-Fi Trust Score",
    generateReport: "Generate Report",
    live: "Live",
    offlineFallback: "Offline fallback",
    loadingNetworkDetails: "Loading live network details...",
    lastUpdated: "Last updated",
    settingsTitle: "Settings",
    monitoring: "Monitoring",
    appearance: "Appearance",
    language: "Language",
    theme: "Theme",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    about: "About",
    scanInterval: "Scan Interval",
    notifications: "Notifications",
  },
  sq: {
    navHome: "Kreu",
    navDevices: "Pajisjet",
    navActivity: "Aktiviteti",    navSpeed: "ShpejtÃ«sia",
    navTerminal: "Terminali",
    navSettings: "CilÃ«simet",
    navigation: "Navigimi",
    homeTitle: "NetPulse",
    dashboardTitle: "Paneli i Rrjetit",
    refresh: "Rifresko",
    wifiTrustScore: "VlerÃ«simi i Besimit Wi-Fi",
    generateReport: "Gjenero Raportin",
    live: "NÃ« kohÃ« reale",
    offlineFallback: "Modalitet fallback",
    loadingNetworkDetails: "Po ngarkohet informacioni i rrjetit...",
    lastUpdated: "PÃ«rditÃ«suar para",
    settingsTitle: "CilÃ«simet",
    monitoring: "Monitorimi",
    appearance: "Pamja",
    language: "Gjuha",
    theme: "Tema",
    darkMode: "Tema e errÃ«t",
    lightMode: "Tema e Ã§elÃ«t",
    about: "Rreth aplikacionit",
    scanInterval: "Intervali i Skanimit",
    notifications: "Njoftimet",
  },
};

