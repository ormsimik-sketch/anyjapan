const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const WEEKDAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Returns a YYYY-MM-DD key using the device's local calendar date (never UTC). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateKeyFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return toDateKey(new Date());
  return toDateKey(date);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function yesterdayKey(): string {
  return addDays(todayKey(), -1);
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

export function dateKeyToDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--:--";
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export function formatWeekdayShort(dateKey: string): string {
  return WEEKDAY_LABELS[dateKeyToDate(dateKey).getDay()];
}

export function formatWeekdayFull(dateKey: string): string {
  return WEEKDAY_LABELS_FULL[dateKeyToDate(dateKey).getDay()];
}

export function formatDayMonth(dateKey: string): string {
  const date = dateKeyToDate(dateKey);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function lastNDateKeys(n: number, endKey: string = todayKey()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    keys.push(addDays(endKey, -i));
  }
  return keys;
}
