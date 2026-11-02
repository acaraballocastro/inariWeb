"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { listZones, type Zone } from "@/features/catalogs/api";
import { listGuides, type GuideDetail } from "@/features/guides/api";
import { listTourDays, type TourDay } from "@/features/tours/api";
import { formatJst, formatJstClock } from "@/lib/datetime";
import { OperationsCalendar, dayKey, monthRange, toneFor, type CalendarMonth } from "./OperationsCalendar";

export function CalendarScreen() {
  // Read the clock after mount so the prerender doesn't freeze a stale month.
  const [today, setToday] = useState("");
  const [month, setMonth] = useState<CalendarMonth | null>(null);
  const [days, setDays] = useState<TourDay[] | null>(null);
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    // Guides and zones only provide labels.
    Promise.all([listGuides().then((items) => items ?? []).catch(() => []), listZones().then((items) => items ?? []).catch(() => [])])
      .then(([guideItems, zoneItems]) => {
        if (!active) return;
        const key = dayKey(new Date());
        setGuides(guideItems); setZones(zoneItems);
        setToday(key);
        setMonth((current) => current ?? { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!month) return;
    let active = true;
    listTourDays(monthRange(month))
      .then((items) => { if (active) { setDays(items.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))); setError(""); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the calendar."); });
    return () => { active = false; };
  }, [month]);

  const guideNames = useMemo(() => new Map(guides.map((item) => [item.guide.id, item.guide.name])), [guides]);
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const guideName = (id: string | null) => (id ? guideNames.get(id) ?? "Assigned guide" : null);
  const zoneName = (id: string | null) => (id ? zoneNames.get(id) ?? null : null);

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Calendar" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Calendar" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="pb-6 pt-8 sm:pt-10">
                <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS / PLANNING</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Calendar</h1>
                <p className="mt-2 text-[11px] text-[#85867c]">Keep every journey moving with a clear view of the season ahead.</p>
              </header>
              {error && <p role="alert" className="mb-5 bg-[#f4e4df] px-4 py-3 text-[10px] text-[#8a3b2c]">{error}</p>}
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
                {month ? <OperationsCalendar month={month} days={days} today={today} guideName={guideName} zoneName={zoneName} onMonthChange={(next) => { setDays(null); setMonth(next); }} /> : <section className="bg-white p-5 text-[10px] text-[#85867c] sm:p-6">Loading calendar…</section>}
                <CalendarSummary days={days} today={today} guideName={guideName} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function CalendarSummary({ days, today, guideName }: { days: TourDay[] | null; today: string; guideName: (id: string | null) => string | null }) {
  const active = (days ?? []).filter((day) => toneFor(day.status) !== "muted");
  const todays = active.filter((day) => dayKey(day.start_datetime) === today);
  const count = (value: number) => (days ? String(value).padStart(2, "0") : "—");

  return (
    <aside className="space-y-5">
      <section className="bg-white p-5 sm:p-6">
        <p className="text-[8px] font-semibold tracking-[0.2em] text-[#9b8353]">TODAY{today ? ` · ${formatJst(`${today}T00:00:00+09:00`, { day: "numeric", month: "short" }).toUpperCase()}` : ""}</p>
        <h2 className="mt-3 font-serif text-xl">Schedule</h2>
        <div className="mt-5 space-y-4">
          {/* Today's days are only listed while the current month is shown. */}
          {days && todays.length === 0 && <p className="text-[9px] text-[#96968b]">No tours today in this view.</p>}
          {todays.map((day) => (
            <Link key={day.id} href={`/tours/${day.id}`} className="block border-l-2 border-[#b9c8b5] pl-3 hover:bg-[#fbfaf7]"><p className="text-[9px] text-[#9b8353]">{formatJstClock(day.start_datetime)}</p><p className="mt-1 text-[10px]">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-[8px] text-[#85867c]">{[guideName(day.guide_id) ?? "No guide", day.people_count ? `${day.people_count} guests` : null].filter(Boolean).join(" · ")}</p></Link>
          ))}
        </div>
      </section>
      <section className="bg-[#e9e5d7] p-5 sm:p-6">
        <p className="text-[8px] font-semibold tracking-[0.2em] text-[#9b8353]">THIS MONTH</p>
        <div className="mt-5 space-y-4">
          <SummaryItem label="Scheduled tour days" value={count(active.length)} />
          <SummaryItem label="Without guide" value={count(active.filter((day) => !day.guide_id).length)} />
          <SummaryItem label="Awaiting guide answer" value={count(active.filter((day) => day.status === "GUIDE_PREASSIGNED").length)} />
          <SummaryItem label="Confirmed" value={count(active.filter((day) => day.status === "CONFIRMED" || day.status === "COMPLETED").length)} />
        </div>
      </section>
    </aside>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-[#d7d1c1] pb-3 text-[10px] last:border-0 last:pb-0"><span>{label}</span><strong className="font-serif text-lg font-normal">{value}</strong></div>;
}
