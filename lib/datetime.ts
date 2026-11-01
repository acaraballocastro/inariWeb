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
