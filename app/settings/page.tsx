"use client";

import { useId, useState, type FormEvent } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { SettingsSection } from "@/components/SettingsSection";
import { GOAL_PRESETS_ML, MAX_GOAL_ML, MIN_GOAL_ML } from "@/lib/constants";
import { useToast } from "@/hooks/useToast";
import { useWaterData } from "@/hooks/useWaterData";
import type { ThemePreference, UnitPreference } from "@/types";

const UNIT_OPTIONS: { value: UnitPreference; label: string }[] = [
  { value: "ml", label: "ml" },
  { value: "l", label: "L" },
];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const { settings, hydrated, updateSettings, resetAllData } = useWaterData();
  const { showToast } = useToast();
  const [customGoal, setCustomGoal] = useState("");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const customGoalId = useId();

  const handleCustomGoalSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(customGoal);
    if (!customGoal.trim() || !Number.isFinite(value)) {
      setGoalError("Enter a goal in ml.");
      return;
    }
    if (value < MIN_GOAL_ML || value > MAX_GOAL_ML) {
      setGoalError(`Goal must be between ${MIN_GOAL_ML} and ${MAX_GOAL_ML} ml.`);
      return;
    }
    updateSettings({ dailyGoalMl: Math.round(value) });
    setCustomGoal("");
    setGoalError(null);
  };

  const handleReset = () => {
    resetAllData();
    showToast("All data deleted");
  };

  if (!hydrated) {
    return (
      <main className="flex flex-1 flex-col items-center gap-4 px-5 pt-6">
        <PageHeader title="Settings" />
        <div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-surface-muted" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-5 px-5 pb-28 pt-6">
      <PageHeader title="Settings" />

      <SettingsSection title="Daily goal">
        <div className="grid grid-cols-3 gap-2">
          {GOAL_PRESETS_ML.map((preset) => {
            const isActive = settings.dailyGoalMl === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => updateSettings({ dailyGoalMl: preset })}
                aria-pressed={isActive}
                className={`rounded-xl border py-3 text-sm font-semibold tabular-nums transition-colors ${
                  isActive
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface-muted text-foreground"
                }`}
              >
                {(preset / 1000).toFixed(1)} L
              </button>
            );
          })}
        </div>
        <form onSubmit={handleCustomGoalSubmit} className="mt-3 flex gap-2">
          <label htmlFor={customGoalId} className="sr-only">
            Custom daily goal in ml
          </label>
          <input
            id={customGoalId}
            type="number"
            inputMode="numeric"
            min={MIN_GOAL_ML}
            max={MAX_GOAL_ML}
            placeholder={`Custom (ml), current ${settings.dailyGoalMl}`}
            value={customGoal}
            onChange={(event) => {
              setCustomGoal(event.target.value);
              if (goalError) setGoalError(null);
            }}
            className="flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm font-medium text-foreground outline-none ring-accent focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
          >
            Set
          </button>
        </form>
        {goalError && (
          <p className="mt-2 text-sm font-medium text-danger" role="alert">
            {goalError}
          </p>
        )}
      </SettingsSection>

      <SettingsSection title="Units">
        <div className="grid grid-cols-2 gap-2">
          {UNIT_OPTIONS.map((option) => {
            const isActive = settings.unit === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateSettings({ unit: option.value })}
                aria-pressed={isActive}
                className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface-muted text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Theme">
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((option) => {
            const isActive = settings.theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateSettings({ theme: option.value })}
                aria-pressed={isActive}
                className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface-muted text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Data">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="w-full rounded-xl border border-danger/30 bg-danger/10 py-3 text-sm font-semibold text-danger transition-transform active:scale-[0.98]"
        >
          Delete all data
        </button>
      </SettingsSection>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleReset}
        title="Delete all data?"
        description="This permanently removes every water entry and resets your settings. This can't be undone."
        confirmLabel="Delete everything"
      />
    </main>
  );
}
