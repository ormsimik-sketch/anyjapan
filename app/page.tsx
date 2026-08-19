"use client";

import { useMemo, useState } from "react";

import { AddCustomSheet } from "@/components/AddCustomSheet";
import { AddWaterButtons } from "@/components/AddWaterButtons";
import { PageHeader } from "@/components/PageHeader";
import { TodayHistoryList } from "@/components/TodayHistoryList";
import { WaterProgress } from "@/components/WaterProgress";
import { formatVolume, getDailyProgress, getEntriesForDay } from "@/lib/calculations";
import { useToast } from "@/hooks/useToast";
import { useWaterData } from "@/hooks/useWaterData";

export default function HomePage() {
  const { entries, settings, hydrated, todayKey, addWater, removeEntry, undoLastAdd } =
    useWaterData();
  const { showToast } = useToast();
  const [customOpen, setCustomOpen] = useState(false);

  const todayEntries = useMemo(
    () => getEntriesForDay(entries, todayKey),
    [entries, todayKey]
  );

  const totalMl = useMemo(
    () => todayEntries.reduce((sum, entry) => sum + entry.amountMl, 0),
    [todayEntries]
  );

  const progress = useMemo(
    () => getDailyProgress(totalMl, settings.dailyGoalMl),
    [totalMl, settings.dailyGoalMl]
  );

  const handleAdd = (amountMl: number) => {
    const entry = addWater(amountMl);
    if (!entry) return;
    showToast(`${formatVolume(entry.amountMl, settings.unit)} added`, {
      label: "Undo",
      onClick: undoLastAdd,
    });
  };

  if (!hydrated) {
    return (
      <main className="flex flex-1 flex-col items-center gap-8 px-5 pt-6">
        <PageHeader title="Water Tracker" showSettingsLink />
        <div className="mt-16 h-64 w-64 animate-pulse rounded-full bg-surface-muted" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-5 pb-28 pt-6">
      <PageHeader title="Water Tracker" showSettingsLink />

      <WaterProgress
        totalMl={progress.totalMl}
        goalMl={progress.goalMl}
        percent={progress.percent}
        remainingMl={progress.remainingMl}
        unit={settings.unit}
      />

      <AddWaterButtons onAdd={handleAdd} onOpenCustom={() => setCustomOpen(true)} />

      <TodayHistoryList entries={todayEntries} unit={settings.unit} onRemove={removeEntry} />

      <AddCustomSheet open={customOpen} onClose={() => setCustomOpen(false)} onAdd={handleAdd} />
    </main>
  );
}
