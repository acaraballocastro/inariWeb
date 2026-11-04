// Operations run in Japan: every date and time is entered and shown in JST,
// whatever the browser timezone. The API stores instants in UTC.
export const operationsTimeZone = "Asia/Tokyo";

// Japan has no DST, so a fixed +09:00 offset is exact.
const jstOffset = "+09:00";
const jstOffsetMs = 9 * 60 * 60 * 1000;

/** Reads a datetime-local value ("YYYY-MM-DDTHH:MM") as JST and returns it as an ISO instant. */
export function jstInputToIso(value: string) {
  return new Date(`${value}:00${jstOffset}`).toISOString();
}

/** Returns an ISO instant as a datetime-local value ("YYYY-MM-DDTHH:MM") in JST. */
export function isoToJstInput(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  return new Date(time + jstOffsetMs).toISOString().slice(0, 16);
}

/** Formats an instant in JST. */
export function formatJst(value: string | Date, options: Intl.DateTimeFormatOptions, locale = "en-GB") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: operationsTimeZone }).format(date);
}

/** "HH:MM" of an instant in JST. */
export function formatJstClock(value: string | Date) {
  return formatJst(value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** "YYYY-MM-DD" of an instant in JST: the operations day it falls on. */
export function toDayKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: operationsTimeZone }).format(new Date(value));
}

/** The instant a JST day ("YYYY-MM-DD") starts. */
export function startOfJstDay(dayKey: string) {
  return new Date(`${dayKey}T00:00:00${jstOffset}`);
}

/** Tour day durations are stored as whole hours and shown as "6h". */
export function formatDuration(hours: number | null | undefined) {
  if (hours == null || hours <= 0) return "";
  return `${hours}h`;
}

/**
 * Parses "6", "6h" or "6 horas" into whole hours.
 * Returns null when empty and NaN when the text is not a whole number of hours.
 */
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase();
  if (!value) return null;

  const match = value.match(/^(\d+)\s*(?:h|hr|hrs|hora|horas|hour|hours)?$/);
  const hours = match ? Number(match[1]) : Number.NaN;
  return hours > 0 ? hours : Number.NaN;
}

/**
 * Reads a typed time as "HH:MM": "9", "930", "0930", "9:30", "9.30" or "17h30".
 * Returns null when it is not a valid time.
 */
export function parseTimeText(text: string): string | null {
  const value = text.trim().toLowerCase();
  let hours: number;
  let minutes: number;
  const separated = value.match(/^(\d{1,2})\s*[:.h]\s*(\d{1,2})?$/);
  if (separated) {
    hours = Number(separated[1]);
    minutes = separated[2] ? Number(separated[2]) : 0;
    if (separated[2]?.length === 1) minutes *= 10;
  } else if (/^\d{1,4}$/.test(value)) {
    hours = Number(value.length <= 2 ? value : value.slice(0, -2));
    minutes = value.length <= 2 ? 0 : Number(value.slice(-2));
  } else {
    return null;
  }
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "HH:MM" every `step` minutes through the day. */
export function timesOfDay(step = 15) {
  const times: string[] = [];
  for (let minute = 0; minute < 24 * 60; minute += step) {
    times.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return times;
}

/** A calendar day ("YYYY-MM-DD") as text, e.g. "Wed, 4 Nov 2026"; no timezone shift. */
export function formatDayKey(dayKey: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
}
