export interface WaterEntry {
  id: string;
  amountMl: number;
  timestamp: string;
}

export type ThemePreference = "system" | "light" | "dark";
export type UnitPreference = "ml" | "l";

export interface AppSettings {
  dailyGoalMl: number;
  unit: UnitPreference;
  theme: ThemePreference;
}

export interface DayStats {
  dateKey: string;
  totalMl: number;
  goalMl: number;
  percent: number;
  goalMet: boolean;
  entries: WaterEntry[];
}

export interface DailyProgress {
  totalMl: number;
  goalMl: number;
  percent: number;
  remainingMl: number;
}

export interface StreakInfo {
  current: number;
  best: number;
}

export interface WeekChartPoint {
  dateKey: string;
  label: string;
  totalMl: number;
  percent: number;
  goalMet: boolean;
  isToday: boolean;
}
