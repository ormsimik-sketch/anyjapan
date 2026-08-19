"use client";

import { formatVolume } from "@/lib/calculations";
import type { UnitPreference } from "@/types";

interface WaterProgressProps {
  totalMl: number;
  goalMl: number;
  percent: number;
  remainingMl: number;
  unit: UnitPreference;
}

const SIZE = 260;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function WaterProgress({ totalMl, goalMl, percent, remainingMl, unit }: WaterProgressProps) {
  const visualPercent = Math.min(100, Math.max(0, percent));
  const offset = CIRCUMFERENCE * (1 - visualPercent / 100);
  const isGoalMet = goalMl > 0 && totalMl >= goalMl;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--track)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="url(#water-gradient)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
          <defs>
            <linearGradient id="water-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
          <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
            {formatVolume(totalMl, unit)}
          </span>
          <span className="text-sm font-medium text-muted">/ {formatVolume(goalMl, unit)}</span>
          <span
            className="mt-2 text-2xl font-semibold tabular-nums text-accent transition-colors duration-500"
            aria-live="polite"
          >
            {percent}%
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-muted">
        {isGoalMet ? "Daily goal reached 🎉" : `${formatVolume(remainingMl, unit)} left`}
      </p>
    </div>
  );
}
