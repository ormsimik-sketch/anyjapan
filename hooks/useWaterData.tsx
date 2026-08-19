"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_SETTINGS, MAX_SINGLE_ENTRY_ML } from "@/lib/constants";
import { todayKey } from "@/lib/date";
import { clearAllData, loadEntries, loadSettings, saveEntries, saveSettings } from "@/lib/storage";
import type { AppSettings, WaterEntry } from "@/types";

interface LastAction {
  type: "add";
  entry: WaterEntry;
}

interface WaterDataContextValue {
  entries: WaterEntry[];
  settings: AppSettings;
  hydrated: boolean;
  todayKey: string;
  addWater: (amountMl: number) => WaterEntry | null;
  removeEntry: (id: string) => void;
  undoLastAdd: () => void;
  lastAction: LastAction | null;
  clearLastAction: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetAllData: () => void;
}

const WaterDataContext = createContext<WaterDataContextValue | null>(null);

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function WaterDataProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [currentDay, setCurrentDay] = useState(todayKey());
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One-time sync read from localStorage (an external system) on mount. State starts
  // with SSR-safe defaults so the first client render matches the server, then this
  // effect swaps in the persisted data — deliberately not derived from props/state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(loadEntries());
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveEntries(entries);
  }, [entries, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
  }, [settings, hydrated]);

  // Recompute "today" on an interval and on tab focus so the app rolls over
  // to a new day automatically if left open across midnight.
  useEffect(() => {
    const tick = () => setCurrentDay(todayKey());
    const interval = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const addWater = useCallback((amountMl: number): WaterEntry | null => {
    if (!Number.isFinite(amountMl)) return null;
    const rounded = Math.round(amountMl);
    if (rounded <= 0) return null;
    const clamped = Math.min(rounded, MAX_SINGLE_ENTRY_ML);

    const entry: WaterEntry = {
      id: createId(),
      amountMl: clamped,
      timestamp: new Date().toISOString(),
    };

    setEntries((prev) => [...prev, entry]);
    setLastAction({ type: "add", entry });

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setLastAction(null), 5000);

    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setLastAction((current) => (current?.entry.id === id ? null : current));
  }, []);

  const undoLastAdd = useCallback(() => {
    setLastAction((current) => {
      if (!current) return current;
      setEntries((prev) => prev.filter((entry) => entry.id !== current.entry.id));
      return null;
    });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  const clearLastAction = useCallback(() => {
    setLastAction(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetAllData = useCallback(() => {
    clearAllData();
    setEntries([]);
    setSettings(DEFAULT_SETTINGS);
    setLastAction(null);
  }, []);

  const value = useMemo<WaterDataContextValue>(
    () => ({
      entries,
      settings,
      hydrated,
      todayKey: currentDay,
      addWater,
      removeEntry,
      undoLastAdd,
      lastAction,
      clearLastAction,
      updateSettings,
      resetAllData,
    }),
    [
      entries,
      settings,
      hydrated,
      currentDay,
      addWater,
      removeEntry,
      undoLastAdd,
      lastAction,
      clearLastAction,
      updateSettings,
      resetAllData,
    ]
  );

  return <WaterDataContext.Provider value={value}>{children}</WaterDataContext.Provider>;
}

export function useWaterData(): WaterDataContextValue {
  const ctx = useContext(WaterDataContext);
  if (!ctx) throw new Error("useWaterData must be used within WaterDataProvider");
  return ctx;
}
