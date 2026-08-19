"use client";

import { Flame, Target, Trophy } from "lucide-react";
import { useMemo } from "react";

import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { WeekChart } from "@/components/WeekChart";
import {
  buildDayTotals,
  calculateStreaks,
  countGoalMetDays,
  formatVolume,
  getAverageLastNDays,
  getWeekChartData,
} from "@/lib/calculations";
import { STATS_TREND_DAYS } from "@/lib/constants";
import { yesterdayKey } from "@/lib/date";
import { useWaterData } from "@/hooks/useWaterData";

export default function StatsPage() {
  const { entries, settings, hydrated, todayKey } = useWaterData();

  const dayTotals = useMemo(() => buildDayTotals(entries), [entries]);
  const todayTotal = dayTotals.get(todayKey) ?? 0;
  const yesterdayTotal = dayTotals.get(yesterdayKey()) ?? 0;
  const avg7 = useMemo(
    () => getAverageLastNDays(dayTotals, STATS_TREND_DAYS, todayKey),
    [dayTotals, todayKey]
  );
  const streaks = useMemo(
    () => calculateStreaks(dayTotals, settings.dailyGoalMl, todayKey),
    [dayTotals, settings.dailyGoalMl, todayKey]
  );
  const goalDays = useMemo(
    () => countGoalMetDays(dayTotals, settings.dailyGoalMl, STATS_TREND_DAYS, todayKey),
    [dayTotals, settings.dailyGoalMl, todayKey]
  );
  const chartData = useMemo(
    () => getWeekChartData(dayTotals, settings.dailyGoalMl, STATS_TREND_DAYS, todayKey),
    [dayTotals, settings.dailyGoalMl, todayKey]
  );

  if (!hydrated) {
    return (
      <main className="flex flex-1 flex-col items-center gap-6 px-5 pt-6">
        <PageHeader title="Statistics" />
        <div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-surface-muted" />
      </main>
    );
  }

  if (entries.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center gap-6 px-5 pt-6">
        <PageHeader title="Statistics" />
        <div className="mt-16 w-full max-w-md rounded-2xl border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted">
            Keep logging your water — your stats will show up here.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-5 px-5 pb-28 pt-6">
      <PageHeader title="Statistics" />

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <StatCard label="Today" value={formatVolume(todayTotal, settings.unit)} />
        <StatCard label="Yesterday" value={formatVolume(yesterdayTotal, settings.unit)} />
        <StatCard
          label="7-day average"
          value={formatVolume(avg7, settings.unit)}
          icon={<Target className="h-4 w-4 text-muted" aria-hidden="true" />}
        />
        <StatCard
          label="Goal met"
          value={`${goalDays} / ${STATS_TREND_DAYS}`}
          sublabel="days this week"
        />
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <StatCard
          label="Current streak"
          value={`🔥 ${streaks.current}`}
          sublabel={streaks.current === 1 ? "day" : "days"}
          icon={<Flame className="h-4 w-4 text-muted" aria-hidden="true" />}
        />
        <StatCard
          label="Best streak"
          value={`${streaks.best}`}
          sublabel={streaks.best === 1 ? "day" : "days"}
          icon={<Trophy className="h-4 w-4 text-muted" aria-hidden="true" />}
        />
      </div>

      <WeekChart data={chartData} unit={settings.unit} />
    </main>
  );
}
