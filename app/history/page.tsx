"use client";

import { useMemo } from "react";

import { DayHistoryRow } from "@/components/DayHistoryRow";
import { PageHeader } from "@/components/PageHeader";
import { buildDayStatsList } from "@/lib/calculations";
import { dateKeyFromTimestamp } from "@/lib/date";
import { useWaterData } from "@/hooks/useWaterData";

export default function HistoryPage() {
  const { entries, settings, hydrated, todayKey } = useWaterData();

  const dateKeys = useMemo(() => {
    const keys = new Set<string>(entries.map((entry) => dateKeyFromTimestamp(entry.timestamp)));
    keys.add(todayKey);
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [entries, todayKey]);

  const days = useMemo(
    () => buildDayStatsList(entries, settings.dailyGoalMl, dateKeys),
    [entries, settings.dailyGoalMl, dateKeys]
  );

  if (!hydrated) {
    return (
      <main className="flex flex-1 flex-col items-center gap-4 px-5 pt-6">
        <PageHeader title="History" />
        <div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-surface-muted" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-4 px-5 pb-28 pt-6">
      <PageHeader title="History" />
      <ul className="flex w-full max-w-md flex-col gap-3">
        {days.map((day) => (
          <DayHistoryRow key={day.dateKey} day={day} unit={settings.unit} isToday={day.dateKey === todayKey} />
        ))}
      </ul>
    </main>
  );
}
