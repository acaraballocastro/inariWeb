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
