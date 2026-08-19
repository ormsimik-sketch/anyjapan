import { DEFAULT_SETTINGS, MAX_GOAL_ML, MIN_GOAL_ML, STORAGE_KEYS } from "@/lib/constants";
import type { AppSettings, ThemePreference, UnitPreference, WaterEntry } from "@/types";

function hasLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__water_tracker_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function isValidEntry(value: unknown): value is WaterEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== "string" || entry.id.length === 0) return false;
  if (typeof entry.amountMl !== "number" || !Number.isFinite(entry.amountMl)) return false;
  if (entry.amountMl <= 0) return false;
  if (typeof entry.timestamp !== "string") return false;
  if (Number.isNaN(new Date(entry.timestamp).getTime())) return false;
  return true;
}

function sanitizeEntries(raw: unknown): WaterEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidEntry).map((entry) => ({
    id: entry.id,
    amountMl: Math.round(entry.amountMl),
    timestamp: entry.timestamp,
  }));
}

function sanitizeSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const value = raw as Record<string, unknown>;

  let dailyGoalMl = DEFAULT_SETTINGS.dailyGoalMl;
  if (typeof value.dailyGoalMl === "number" && Number.isFinite(value.dailyGoalMl)) {
    dailyGoalMl = Math.min(MAX_GOAL_ML, Math.max(MIN_GOAL_ML, Math.round(value.dailyGoalMl)));
  }

  let unit: UnitPreference = DEFAULT_SETTINGS.unit;
  if (value.unit === "ml" || value.unit === "l") unit = value.unit;

  let theme: ThemePreference = DEFAULT_SETTINGS.theme;
  if (value.theme === "system" || value.theme === "light" || value.theme === "dark") {
    theme = value.theme;
  }

  return { dailyGoalMl, unit, theme };
}

export function loadEntries(): WaterEntry[] {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.entries);
    if (!raw) return [];
    return sanitizeEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveEntries(entries: WaterEntry[]): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable mid-session: fail silently, in-memory state still works.
  }
}

export function loadSettings(): AppSettings {
  if (!hasLocalStorage()) return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function clearAllData(): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.entries);
    window.localStorage.removeItem(STORAGE_KEYS.settings);
  } catch {
    // ignore
  }
}

export { hasLocalStorage };
