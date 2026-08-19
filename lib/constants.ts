import type { AppSettings } from "@/types";

export const APP_NAME = "Water Tracker";

export const DEFAULT_DAILY_GOAL_ML = 3000;

export const MIN_GOAL_ML = 500;
export const MAX_GOAL_ML = 10000;

export const MAX_SINGLE_ENTRY_ML = 5000;

export const GOAL_PRESETS_ML = [1500, 2000, 2500, 3000, 3500, 4000];

export const QUICK_ADD_AMOUNTS_ML = [250, 500, 750, 1000];

export const DEFAULT_SETTINGS: AppSettings = {
  dailyGoalMl: DEFAULT_DAILY_GOAL_ML,
  unit: "ml",
  theme: "system",
};

export const STORAGE_KEYS = {
  entries: "water-tracker:entries:v1",
  settings: "water-tracker:settings:v1",
} as const;

export const STATS_TREND_DAYS = 7;
