import Link from "next/link";
import type { ReactNode } from "react";
import { isInProgress, type TourDay } from "@/features/tours/api";
import { formatDuration, formatJst, formatJstClock } from "@/lib/datetime";
import { formatStatus, isCancelled } from "@/lib/status";

/**
 * A tour day in the guide's lists, sized for a phone: date block, title, the
 * facts to decide or prepare, its status and an optional action (take, check
 * in). The whole card opens the day.
 */
export function TourDayCard({ day, zone, action, note }: { day: TourDay; zone: string | null; action?: ReactNode; note?: string }) {
  const inProgress = isInProgress(day);
  return (
    <article className={`flex items-stretch gap-3 bg-white p-3 sm:p-4 ${isCancelled(day.status) ? "opacity-60" : ""}`}>
      <Link href={`/tours/${day.id}`} className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex w-12 shrink-0 flex-col items-center bg-[#f1f0ec] py-2 text-center">
          <span className="text-label uppercase tracking-[0.12em] text-[#9b8353]">{formatJst(day.start_datetime, { month: "short" })}</span>
          <span className="font-serif text-xl leading-tight">{formatJst(day.start_datetime, { day: "numeric" })}</span>
          <span className="text-label text-[#85867c]">{formatJst(day.start_datetime, { weekday: "short" })}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lead font-medium">{day.title || day.code || "Tour day"}</span>
          <span className="mt-1 block text-meta text-[#85867c]">{[formatJstClock(day.start_datetime), formatDuration(day.duration), zone ?? "No zone", day.people_count ? `${day.people_count} guests` : null].filter(Boolean).join(" · ")}</span>
          {note && <span className="mt-1 block text-meta text-[#9b8353]">{note}</span>}
          <span className={`mt-2 inline-block px-2 py-0.5 text-label ${inProgress ? "bg-[#eef0e9] text-[#68705d]" : "bg-[#ebe7da] text-[#77786f]"}`}>{inProgress ? `In progress since ${formatJstClock(day.checked_in_at ?? "")}` : formatStatus(day.status)}</span>
        </span>
      </Link>
      {action && <div className="flex shrink-0 items-center">{action}</div>}
    </article>
  );
}
