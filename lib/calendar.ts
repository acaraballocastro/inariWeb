import { startOfJstDay } from "./datetime.ts";

export type CalendarMonth = { year: number; month: number };

const dayMs = 86_400_000;
const pad = (value: number) => String(value).padStart(2, "0");

/** The JST instants that bound a month, for the API range [from, to). */
export function monthRange(month: CalendarMonth) {
  const next = new Date(Date.UTC(month.year, month.month, 1));
  return {
    from: startOfJstDay(`${month.year}-${pad(month.month)}-01`).toISOString(),
    to: startOfJstDay(`${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`).toISOString(),
  };
}

/** Day keys of whole weeks, from the Monday on or before the 1st to the Sunday on or after the last day. */
export function monthCells(month: CalendarMonth) {
  const first = new Date(Date.UTC(month.year, month.month - 1, 1));
  const last = new Date(Date.UTC(month.year, month.month, 0));
  const start = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * dayMs);
  const end = new Date(last.getTime() + ((7 - last.getUTCDay()) % 7) * dayMs);
  const cells: string[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += dayMs) cells.push(new Date(time).toISOString().slice(0, 10));
  return cells;
}

/** The month before or after. */
export function shiftMonth(month: CalendarMonth, delta: number): CalendarMonth {
  const date = new Date(Date.UTC(month.year, month.month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** The day key `days` after (or before) another: "2026-11-30" + 1 → "2026-12-01". */
export function addDays(dayKey: string, days: number) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The same day of another month, clamped to its length: 31 Jan + 1 month → 28 (or 29) Feb. */
export function addMonths(dayKey: string, months: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, length));
  return first.toISOString().slice(0, 10);
}

/** The month a day key falls in. */
export function monthOf(dayKey: string): CalendarMonth {
  return { year: Number(dayKey.slice(0, 4)), month: Number(dayKey.slice(5, 7)) };
}

/** Whether a day key is within the optional, inclusive [min, max]. */
export function isWithin(dayKey: string, min?: string, max?: string) {
  return (!min || dayKey >= min) && (!max || dayKey <= max);
}
