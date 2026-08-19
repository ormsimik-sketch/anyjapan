import { STATS_TREND_DAYS } from "@/lib/constants";
import { addDays, dateKeyFromTimestamp, formatWeekdayShort, lastNDateKeys, todayKey } from "@/lib/date";
import type { DailyProgress, DayStats, StreakInfo, WaterEntry, WeekChartPoint } from "@/types";

/** Groups entries by local calendar day (YYYY-MM-DD), newest entry first within each day. */
export function groupEntriesByDay(entries: WaterEntry[]): Map<string, WaterEntry[]> {
  const map = new Map<string, WaterEntry[]>();
  for (const entry of entries) {
    const key = dateKeyFromTimestamp(entry.timestamp);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  return map;
}

export function getEntriesForDay(entries: WaterEntry[], dateKey: string): WaterEntry[] {
  return entries
    .filter((entry) => dateKeyFromTimestamp(entry.timestamp) === dateKey)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getDayTotalMl(entries: WaterEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.amountMl, 0);
}

export function getPercent(totalMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.round((totalMl / goalMl) * 100);
}

export function getDailyProgress(totalMl: number, goalMl: number): DailyProgress {
  const percent = getPercent(totalMl, goalMl);
  const remainingMl = Math.max(0, goalMl - totalMl);
  return { totalMl, goalMl, percent, remainingMl };
}

/** Sum of daily totals for the last N calendar days (missing days count as 0). */
export function getAverageLastNDays(
  dayTotals: Map<string, number>,
  days: number = STATS_TREND_DAYS,
  endKey: string = todayKey()
): number {
  const keys = lastNDateKeys(days, endKey);
  const sum = keys.reduce((acc, key) => acc + (dayTotals.get(key) ?? 0), 0);
  return Math.round(sum / days);
}

export function buildDayTotals(entries: WaterEntry[]): Map<string, number> {
  const grouped = groupEntriesByDay(entries);
  const totals = new Map<string, number>();
  for (const [key, dayEntries] of grouped) {
    totals.set(key, getDayTotalMl(dayEntries));
  }
  return totals;
}

/**
 * Current streak of consecutive days meeting the goal, ending "today" if met,
 * or "yesterday" if today isn't over/met yet (today never breaks a live streak).
 */
export function calculateCurrentStreak(
  dayTotals: Map<string, number>,
  goalMl: number,
  today: string = todayKey()
): number {
  if (goalMl <= 0) return 0;
  const metGoal = (key: string) => (dayTotals.get(key) ?? 0) >= goalMl;

  let streak = 0;
  let cursor = today;

  if (metGoal(today)) {
    streak = 1;
    cursor = addDays(today, -1);
  } else {
    cursor = addDays(today, -1);
  }

  while (metGoal(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/** Longest run of consecutive goal-met days across all recorded history. */
export function calculateBestStreak(
  dayTotals: Map<string, number>,
  goalMl: number,
  today: string = todayKey()
): number {
  if (goalMl <= 0 || dayTotals.size === 0) return 0;

  const keys = Array.from(dayTotals.keys()).sort();
  const earliest = keys[0];

  let best = 0;
  let running = 0;
  let cursor = earliest;

  while (cursor <= today) {
    const total = dayTotals.get(cursor) ?? 0;
    if (total >= goalMl) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
    cursor = addDays(cursor, 1);
  }

  return best;
}

export function calculateStreaks(
  dayTotals: Map<string, number>,
  goalMl: number,
  today: string = todayKey()
): StreakInfo {
  return {
    current: calculateCurrentStreak(dayTotals, goalMl, today),
    best: calculateBestStreak(dayTotals, goalMl, today),
  };
}

export function countGoalMetDays(
  dayTotals: Map<string, number>,
  goalMl: number,
  days: number = STATS_TREND_DAYS,
  endKey: string = todayKey()
): number {
  if (goalMl <= 0) return 0;
  const keys = lastNDateKeys(days, endKey);
  return keys.filter((key) => (dayTotals.get(key) ?? 0) >= goalMl).length;
}

export function getWeekChartData(
  dayTotals: Map<string, number>,
  goalMl: number,
  days: number = STATS_TREND_DAYS,
  endKey: string = todayKey()
): WeekChartPoint[] {
  const keys = lastNDateKeys(days, endKey);
  return keys.map((key) => {
    const totalMl = dayTotals.get(key) ?? 0;
    return {
      dateKey: key,
      label: formatWeekdayShort(key),
      totalMl,
      percent: getPercent(totalMl, goalMl),
      goalMet: goalMl > 0 && totalMl >= goalMl,
      isToday: key === endKey,
    };
  });
}

export function buildDayStatsList(
  entries: WaterEntry[],
  goalMl: number,
  dateKeys: string[]
): DayStats[] {
  const grouped = groupEntriesByDay(entries);
  return dateKeys.map((dateKey) => {
    const dayEntries = grouped.get(dateKey) ?? [];
    const totalMl = getDayTotalMl(dayEntries);
    return {
      dateKey,
      totalMl,
      goalMl,
      percent: getPercent(totalMl, goalMl),
      goalMet: goalMl > 0 && totalMl >= goalMl,
      entries: dayEntries,
    };
  });
}

export function mlToDisplay(amountMl: number, unit: "ml" | "l"): string {
  if (unit === "l") {
    return (amountMl / 1000).toFixed(1);
  }
  return String(Math.round(amountMl));
}

export function formatVolume(amountMl: number, unit: "ml" | "l"): string {
  if (unit === "l") {
    return `${(amountMl / 1000).toFixed(1)} L`;
  }
  return `${Math.round(amountMl)} ml`;
}
