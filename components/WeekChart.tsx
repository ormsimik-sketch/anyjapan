"use client";

import { formatVolume } from "@/lib/calculations";
import type { UnitPreference, WeekChartPoint } from "@/types";

interface WeekChartProps {
  data: WeekChartPoint[];
  unit: UnitPreference;
}

const CHART_HEIGHT = 140;

export function WeekChart({ data, unit }: WeekChartProps) {
  const maxValue = Math.max(...data.map((point) => point.totalMl), 1);

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-muted">Last 7 days</h2>
      <div className="flex items-end justify-between gap-2" style={{ height: CHART_HEIGHT }}>
        {data.map((point) => {
          const barHeight = Math.max(4, Math.round((point.totalMl / maxValue) * (CHART_HEIGHT - 24)));
          return (
            <div key={point.dateKey} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-full w-full items-end justify-center">
                <div
                  role="img"
                  aria-label={`${point.label}: ${formatVolume(point.totalMl, unit)}, ${point.percent}% of goal`}
                  className={`w-full max-w-6 rounded-full transition-all duration-500 ease-out ${
                    point.goalMet
                      ? "bg-gradient-to-t from-blue-600 to-sky-400"
                      : point.isToday
                        ? "bg-accent/70"
                        : "bg-track"
                  }`}
                  style={{ height: barHeight }}
                />
              </div>
              <span
                className={`text-xs font-medium ${point.isToday ? "text-accent" : "text-muted"}`}
              >
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
