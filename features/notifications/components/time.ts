import { formatJst } from "@/lib/datetime";

/** "5 min ago" for the last hour, then the date and time in Japan. */
export function formatNotificationTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${formatJst(value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} JST`;
}
