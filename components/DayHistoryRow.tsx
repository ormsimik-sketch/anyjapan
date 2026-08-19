import { CheckCircle2 } from "lucide-react";

import { formatVolume } from "@/lib/calculations";
import { formatDayMonth, formatWeekdayFull } from "@/lib/date";
import type { DayStats, UnitPreference } from "@/types";

interface DayHistoryRowProps {
  day: DayStats;
  unit: UnitPreference;
  isToday: boolean;
}

export function DayHistoryRow({ day, unit, isToday }: DayHistoryRowProps) {
  const barWidth = Math.min(100, Math.max(0, day.percent));

  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isToday ? "Today" : formatWeekdayFull(day.dateKey)}
          </p>
          <p className="text-xs text-muted">{formatDayMonth(day.dateKey)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {formatVolume(day.totalMl, unit)}
            </p>
            <p className="text-xs tabular-nums text-muted">{day.percent}%</p>
          </div>
          {day.goalMet && (
            <CheckCircle2 className="h-5 w-5 text-success" aria-label="Goal achieved" />
          )}
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-track">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            day.goalMet ? "bg-success" : "bg-accent"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </li>
  );
}
