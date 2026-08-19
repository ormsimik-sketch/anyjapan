"use client";

import { Droplet, X } from "lucide-react";

import { formatVolume } from "@/lib/calculations";
import { formatTime } from "@/lib/date";
import type { UnitPreference, WaterEntry } from "@/types";

interface TodayHistoryListProps {
  entries: WaterEntry[];
  unit: UnitPreference;
  onRemove: (id: string) => void;
}

export function TodayHistoryList({ entries, unit, onRemove }: TodayHistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-dashed border-border py-8 text-center">
        <p className="text-sm text-muted">Start with your first glass 💧</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h2 className="mb-2 px-1 text-sm font-semibold text-muted">Today</h2>
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="animate-entry-in flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
                <Droplet className="h-4 w-4 text-accent" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {formatVolume(entry.amountMl, unit)}
                </p>
                <p className="text-xs text-muted">{formatTime(entry.timestamp)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              aria-label={`Delete entry of ${formatVolume(entry.amountMl, unit)} at ${formatTime(entry.timestamp)}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-danger"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
