"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { TourDay } from "@/features/tours/api";
import { monthCells, shiftMonth, type CalendarMonth } from "@/lib/calendar";
import { formatJst, formatJstClock, toDayKey } from "@/lib/datetime";
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

type CalendarView = "Month" | "Agenda";

export function OperationsCalendar({ month, days, today, guideName, zoneName, onMonthChange }: { month: CalendarMonth; days: TourDay[] | null; today: string; guideName: (id: string | null) => string | null; zoneName: (id: string | null) => string | null; onMonthChange: (month: CalendarMonth) => void }) {
  const [view, setView] = useState<CalendarView>("Month");
  // A month grid does not fit a phone: start with the agenda there.
  useEffect(() => {
    // The screen size is only known in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.matchMedia("(max-width: 767px)").matches) setView("Agenda");
  }, []);
  const [showCancelled, setShowCancelled] = useState(false);

  const visible = (days ?? []).filter((day) => showCancelled || toneFor(day.status) !== "muted");
  const byDate = new Map<string, TourDay[]>();
  for (const day of visible) {
    const key = toDayKey(day.start_datetime);
    byDate.set(key, [...(byDate.get(key) ?? []), day]);
  }

  const shift = (delta: number) => onMonthChange(shiftMonth(month, delta));
  const goToday = () => onMonthChange({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });

  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[#ecebe5] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS PLANNING</p>
          <h2 className="mt-3 font-serif text-2xl">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(month.year, month.month - 1, 1)))}</h2>
          <p className="mt-2 text-meta text-[#96968b]">Japan Standard Time · {days ? `${visible.length} tour days` : "Loading…"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="border border-[#deddd6] px-3 py-2 text-meta text-[#77786f] hover:bg-[#f8f7f3]">‹</button>
          <button type="button" onClick={goToday} className="border border-[#deddd6] px-3 py-2 text-meta text-[#77786f] hover:bg-[#f8f7f3]">Today</button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="border border-[#deddd6] px-3 py-2 text-meta text-[#77786f] hover:bg-[#f8f7f3]">›</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-[#f8f7f3] p-1">
          {(["Month", "Agenda"] as CalendarView[]).map((option) => (
            <button key={option} type="button" onClick={() => setView(option)} className={`px-3 py-2 text-meta ${view === option ? "bg-white text-[#292b26] shadow-sm" : "text-[#96968b]"}`}>
              {option}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-label text-[#85867c]">
          <Legend tone="bg-[#cfc09b]" label="Needs guide / answer" />
          <Legend tone="bg-[#bac8d0]" label="Payment & documents" />
          <Legend tone="bg-[#b9c8b5]" label="Confirmed" />
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={showCancelled} onChange={(event) => setShowCancelled(event.target.checked)} />Cancelled</label>
        </div>
      </div>

      {view === "Month" && <MonthView month={month} byDate={byDate} today={today} />}
      {view === "Agenda" && <AgendaView days={visible} guideName={guideName} zoneName={zoneName} />}
    </section>
  );
}

function MonthView({ month, byDate, today }: { month: CalendarMonth; byDate: Map<string, TourDay[]>; today: string }) {
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgendaView({ days, guideName, zoneName }: { days: TourDay[]; guideName: (id: string | null) => string | null; zoneName: (id: string | null) => string | null }) {
  if (days.length === 0) return <p className="mt-6 text-body text-[#85867c]">No tour days this month.</p>;
  return (
    <div className="mt-6 divide-y divide-[#ecebe5] border-y border-[#ecebe5]">
      {days.map((day) => (
        <Link key={day.id} href={`/tours/${day.id}`} className="grid gap-3 py-4 hover:bg-[#fbfaf7] sm:grid-cols-[80px_60px_minmax(0,1fr)_130px] sm:items-center">
          <span className="font-serif text-lg">{formatJst(day.start_datetime, { day: "numeric", month: "short" })}</span>
          <span className="text-meta text-[#9b8353]">{formatJstClock(day.start_datetime)}</span>
          <div className="min-w-0"><p className="text-body">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-label text-[#96968b]">{[day.code, zoneName(day.zone_id), guideName(day.guide_id) ?? "No guide", day.people_count ? `${day.people_count} guests` : null].filter(Boolean).join(" · ")}</p></div>
          <span className={`w-fit border-l-2 px-2 py-1 text-label ${toneStyles[toneFor(day.status)]}`}>{formatStatus(day.status)}</span>
        </Link>
      ))}
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2 w-2 ${tone}`} />{label}</span>;
}


