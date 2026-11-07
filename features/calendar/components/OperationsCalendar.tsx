"use client";

import Link from "next/link";

import type { TourDay } from "@/features/tours/api";
import { addDays, monthCells, monthOf, viewDays, type CalendarView } from "@/lib/calendar";
import { formatDuration, formatJst, formatJstClock, toDayKey } from "@/lib/datetime";
import { formatStatus, isCancelled } from "@/lib/status";

type Tone = "gold" | "green" | "blue" | "muted";

const toneStyles: Record<Tone, string> = {
  gold: "border-[#cfc09b] bg-[#f2eddf]",
  green: "border-[#b9c8b5] bg-[#e8efe7]",
  blue: "border-[#bac8d0] bg-[#e8eef0]",
  muted: "border-[#deddd6] bg-[#f5f4f0] line-through opacity-70",
};

export function toneFor(status: string): Tone {
  if (status === "PENDING_ASSIGNMENT" || status === "GUIDE_PREASSIGNED") return "gold";
  if (status === "CONFIRMED" || status === "COMPLETED") return "green";
  if (isCancelled(status)) return "muted";
  return "blue";
}

export const calendarViews: CalendarView[] = ["Month", "Week", "Day", "Agenda"];

type Labels = { guideName: (id: string | null) => string | null; zoneName: (id: string | null) => string | null };

/**
 * The calendar body for one view around `anchor` (a day key). `days` are the
 * tour days of the view's range, already filtered; `timeOff` the guides off on
 * each day key.
 */
export function OperationsCalendar({ view, anchor, days, timeOff, today, guideName, zoneName }: { view: CalendarView; anchor: string; days: TourDay[] | null; timeOff: Map<string, string[]>; today: string } & Labels) {
  const byDate = new Map<string, TourDay[]>();
  for (const day of days ?? []) {
    const key = toDayKey(day.start_datetime);
    byDate.set(key, [...(byDate.get(key) ?? []), day]);
  }
  if (!days) return <p className="mt-6 text-body text-[#85867c]">Loading…</p>;
  if (view === "Month") return <MonthView anchor={anchor} byDate={byDate} timeOff={timeOff} today={today} />;
  if (view === "Week") return <WeekView anchor={anchor} byDate={byDate} timeOff={timeOff} today={today} guideName={guideName} zoneName={zoneName} />;
  if (view === "Day") return <DayList dayKey={anchor} days={byDate.get(anchor) ?? []} off={timeOff.get(anchor) ?? []} guideName={guideName} zoneName={zoneName} />;
  return <AgendaView days={days} timeOff={timeOff} guideName={guideName} zoneName={zoneName} />;
}

/** The title of a view: "November 2026", "2 – 8 Nov 2026" or "Friday 6 November 2026". */
export function viewTitle(view: CalendarView, anchor: string) {
  const at = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
  if (view === "Day") return at(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "Week") {
    const { first, last } = viewDays("Week", anchor);
    const sameMonth = first.slice(0, 7) === last.slice(0, 7);
    return `${at(first, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })} – ${at(last, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return at(anchor, { month: "long", year: "numeric" });
}

function OffNote({ names, compact = false }: { names: string[]; compact?: boolean }) {
  if (names.length === 0) return null;
  const text = compact ? (names.length === 1 ? `${names[0]} off` : `${names.length} guides off`) : `Off: ${names.join(", ")}`;
  return <p title={`Off: ${names.join(", ")}`} className={`border-l-2 border-[#d9b8ad] bg-[#f7ece8] px-2 py-1 text-label text-[#8a5a4c] ${compact ? "truncate" : ""}`}>{text}</p>;
}

function MonthView({ anchor, byDate, timeOff, today }: { anchor: string; byDate: Map<string, TourDay[]>; timeOff: Map<string, string[]>; today: string }) {
  const month = monthOf(anchor);
  const cells = monthCells(month);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mt-6 grid grid-cols-7 text-center text-label font-semibold tracking-[0.14em] text-[#a19a87]">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="mt-2 grid grid-cols-7 border-l border-t border-[#deddd6]">
          {cells.map((key) => {
            const items = byDate.get(key) ?? [];
            const muted = Number(key.slice(5, 7)) !== month.month;
            return (
              <div key={key} className={`min-h-[110px] border-b border-r border-[#deddd6] p-2 text-right ${key === today ? "bg-[#fbf8ed]" : ""}`}>
                <span className={`text-meta ${muted ? "text-[#bbbcb4]" : "text-[#77786f]"}`}>{Number(key.slice(8, 10))}</span>
                <div className="mt-2 space-y-1 text-left">
                  {items.slice(0, 3).map((day) => <Link key={day.id} href={`/tours/${day.id}`} className={`block border-l-2 px-2 py-1.5 hover:brightness-95 ${toneStyles[toneFor(day.status)]}`}><p className="text-label text-[#55574f]">{formatJstClock(day.start_datetime)}</p><p className="mt-1 truncate text-label text-[#77786f]">{day.title || day.code || "Tour day"}</p></Link>)}
                  {items.length > 3 && <p className="px-1 text-label text-[#96968b]">+{items.length - 3} more</p>}
                  <OffNote names={timeOff.get(key) ?? []} compact />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Seven columns on wide screens; one day under another on phones. */
function WeekView({ anchor, byDate, timeOff, today, guideName, zoneName }: { anchor: string; byDate: Map<string, TourDay[]>; timeOff: Map<string, string[]>; today: string } & Labels) {
  const { first } = viewDays("Week", anchor);
  const keys = Array.from({ length: 7 }, (_, index) => addDays(first, index));
  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-7 lg:gap-0 lg:border-l lg:border-t lg:border-[#deddd6]">
      {keys.map((key) => {
        const items = byDate.get(key) ?? [];
        return (
          <div key={key} className={`min-w-0 border border-[#deddd6] p-3 lg:min-h-[320px] lg:border-l-0 lg:border-t-0 ${key === today ? "bg-[#fbf8ed]" : ""}`}>
            <p className="text-label font-semibold tracking-[0.14em] text-[#a19a87]">{formatJst(`${key}T00:00:00+09:00`, { weekday: "short" }).toUpperCase()} <span className="font-serif text-lg font-normal tracking-normal text-[#55574f]">{Number(key.slice(8, 10))}</span></p>
            <div className="mt-3 space-y-1.5">
              {items.length === 0 && <p className="text-label text-[#bbbcb4] lg:hidden">No tours</p>}
              {items.map((day) => (
                <Link key={day.id} href={`/tours/${day.id}`} className={`block border-l-2 px-2 py-1.5 hover:brightness-95 ${toneStyles[toneFor(day.status)]}`}>
                  <p className="text-label text-[#55574f]">{formatJstClock(day.start_datetime)}{day.duration ? ` · ${formatDuration(day.duration)}` : ""}</p>
                  <p className="mt-1 truncate text-label text-[#292b26]">{day.title || day.code || "Tour day"}</p>
                  <p className="mt-0.5 truncate text-label text-[#85867c]">{guideName(day.guide_id) ?? "No guide"}{zoneName(day.zone_id) ? ` · ${zoneName(day.zone_id)}` : ""}</p>
                </Link>
              ))}
              <OffNote names={timeOff.get(key) ?? []} compact />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({ dayKey, days, off, guideName, zoneName }: { dayKey: string; days: TourDay[]; off: string[] } & Labels) {
  return (
    <div className="mt-6 space-y-4">
      <OffNote names={off} />
      {days.length === 0 ? <p className="text-body text-[#85867c]">No tours on {formatJst(`${dayKey}T00:00:00+09:00`, { day: "numeric", month: "long" })}.</p> : <TourRows days={days} guideName={guideName} zoneName={zoneName} showDate={false} />}
    </div>
  );
}

function AgendaView({ days, timeOff, guideName, zoneName }: { days: TourDay[]; timeOff: Map<string, string[]> } & Labels) {
  if (days.length === 0) return <p className="mt-6 text-body text-[#85867c]">No tour days this month.</p>;
  const offOnDays = [...new Set(days.map((day) => toDayKey(day.start_datetime)))].filter((key) => timeOff.has(key));
  return (
    <>
      {offOnDays.length > 0 && (
        <div className="mt-6 space-y-1 border-l-2 border-[#d9b8ad] bg-[#f7ece8] px-3 py-2 text-label text-[#8a5a4c]">
          {offOnDays.map((key) => <p key={key}><span className="font-medium">{formatJst(`${key}T00:00:00+09:00`, { day: "numeric", month: "short" })}</span> · Off: {(timeOff.get(key) ?? []).join(", ")}</p>)}
        </div>
      )}
      <div className="mt-6"><TourRows days={days} guideName={guideName} zoneName={zoneName} showDate /></div>
    </>
  );
}

function TourRows({ days, guideName, zoneName, showDate }: { days: TourDay[]; showDate: boolean } & Labels) {
  return (
    <div className="divide-y divide-[#ecebe5] border-y border-[#ecebe5]">
      {days.map((day) => (
        <Link key={day.id} href={`/tours/${day.id}`} className={`grid gap-3 py-4 hover:bg-[#fbfaf7] sm:items-center ${showDate ? "sm:grid-cols-[80px_60px_minmax(0,1fr)_130px]" : "sm:grid-cols-[60px_minmax(0,1fr)_130px]"}`}>
          {showDate && <span className="font-serif text-lg">{formatJst(day.start_datetime, { day: "numeric", month: "short" })}</span>}
          <span className="text-meta text-[#9b8353]">{formatJstClock(day.start_datetime)}</span>
          <div className="min-w-0"><p className="text-body">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-label text-[#96968b]">{[day.code, zoneName(day.zone_id), guideName(day.guide_id) ?? "No guide", day.people_count ? `${day.people_count} guests` : null, formatDuration(day.duration) || null].filter(Boolean).join(" · ")}</p></div>
          <span className={`w-fit border-l-2 px-2 py-1 text-label ${toneStyles[toneFor(day.status)]}`}>{formatStatus(day.status)}</span>
        </Link>
      ))}
    </div>
  );
}

export function Legend({ tone, label }: { tone: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2 w-2 ${tone}`} />{label}</span>;
}
