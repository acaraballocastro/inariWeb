"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { Select } from "@/features/dashboard/components/Select";
import { listZones, type Zone } from "@/features/catalogs/api";
import { listAllAvailabilities, listGuides, timeOffByDay, type GuideDetail, type GuideTimeOff } from "@/features/guides/api";
import { listTourDays, type TourDay } from "@/features/tours/api";
import { dayRange, stepAnchor, viewDays, type CalendarView } from "@/lib/calendar";
import { formatJst, formatJstClock, toDayKey } from "@/lib/datetime";
import { withFallback } from "@/lib/missing";
import { calendarViews, Legend, OperationsCalendar, toneFor, viewTitle } from "./OperationsCalendar";

/** Status filters: groups of the API statuses, as the calendar colours them. */
const statusFilters: { value: string; label: string; statuses?: string[] }[] = [
  { value: "", label: "Any status" },
  { value: "needs-guide", label: "Needs guide", statuses: ["PENDING_ASSIGNMENT"] },
  { value: "preassigned", label: "Preassigned", statuses: ["GUIDE_PREASSIGNED"] },
  { value: "documents", label: "Payment & documents", statuses: ["GUIDE_CONFIRMED", "PAYMENT_PENDING", "VOUCHER_PENDING", "SIGNATURE_PENDING", "PARTIALLY_CONFIRMED"] },
  { value: "confirmed", label: "Confirmed", statuses: ["CONFIRMED", "COMPLETED"] },
  { value: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "FORCE_MAJEURE_CANCELLED"] },
];

type Filters = { guideId: string; zoneId: string; status: string };

const filterClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";

export function CalendarScreen() {
  // Read the clock after mount so the prerender doesn't freeze a stale day.
  const [today, setToday] = useState("");
  const [anchor, setAnchor] = useState("");
  const [view, setView] = useState<CalendarView>("Month");
  const [filters, setFilters] = useState<Filters>({ guideId: "", zoneId: "", status: "" });
  const [showCancelled, setShowCancelled] = useState(false);
  const [result, setResult] = useState<{ key: string; days: TourDay[] } | null>(null);
  const [blocks, setBlocks] = useState<GuideTimeOff[]>([]);
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState("");
  const { missing, report } = useMissingData();

  useEffect(() => {
    let active = true;
    // Guides and zones provide labels and the filters' options.
    const failed: string[] = [];
    Promise.all([withFallback(listGuides().then((items) => items ?? []), [], "guides", failed), withFallback(listZones().then((items) => items ?? []), [], "zones", failed)])
      .then(([guideItems, zoneItems]) => {
        if (!active) return;
        failed.forEach(report);
        const key = toDayKey(new Date());
        setGuides(guideItems); setZones(zoneItems);
        setToday(key);
        setAnchor((current) => current || key);
        // A month grid does not fit a phone: start with the agenda there.
        if (window.matchMedia("(max-width: 767px)").matches) setView("Agenda");
      });
    return () => { active = false; };
  }, [report]);

  const range = anchor ? viewDays(view, anchor) : null;
  const status = statusFilters.find((item) => item.value === filters.status)?.statuses;
  const requestKey = range ? JSON.stringify({ range, filters }) : "";

  useEffect(() => {
    if (!range) return;
    let active = true;
    listTourDays({ ...dayRange(range.first, range.last), guideId: filters.guideId || undefined, zoneId: filters.zoneId || undefined, status })
      .then((items) => { if (active) { setResult({ key: requestKey, days: items.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime)) }); setError(""); } })
      .catch((requestError: unknown) => { if (active) { setResult({ key: requestKey, days: [] }); setError(requestError instanceof Error ? requestError.message : "Could not load the calendar."); } });
    return () => { active = false; };
    // requestKey stands for range, filters and status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const blocksKey = range ? `${range.first}/${range.last}` : "";
  useEffect(() => {
    if (!range) return;
    let active = true;
    listAllAvailabilities(range.first, range.last)
      .then((items) => { if (active) setBlocks(items); })
      .catch(() => { if (active) { setBlocks([]); report("guide availability"); } });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksKey, report]);

  // Cancelled days show only when asked for (checkbox or the Cancelled filter).
  const loaded = result?.key === requestKey ? result.days : null;
  const days = loaded && (showCancelled || filters.status === "cancelled" ? loaded : loaded.filter((day) => toneFor(day.status) !== "muted"));
  const timeOff = useMemo(() => {
    if (!range) return new Map<string, string[]>();
    return timeOffByDay(filters.guideId ? blocks.filter((block) => block.guide_id === filters.guideId) : blocks, range.first, range.last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, filters.guideId, blocksKey]);

  const guideNames = useMemo(() => new Map(guides.map((item) => [item.guide.id, item.guide.name])), [guides]);
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const guideName = (id: string | null) => (id ? guideNames.get(id) ?? "Assigned guide" : null);
  const zoneName = (id: string | null) => (id ? zoneNames.get(id) ?? null : null);
  const filtered = filters.guideId !== "" || filters.zoneId !== "" || filters.status !== "";

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Calendar" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Calendar" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="pb-6 pt-8 sm:pt-10">
                <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS / PLANNING</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Calendar</h1>
                <p className="mt-2 text-lead text-[#85867c]">Keep every journey moving with a clear view of the season ahead.</p>
              </header>
              {error && <p role="alert" className="mb-5 bg-[#f4e4df] px-4 py-3 text-body text-[#8a3b2c]">{error}</p>}
              <MissingDataNotice missing={missing} className="mb-5" />
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
                <section className="min-w-0 bg-white p-5 sm:p-6">
                  {!anchor ? <p className="text-body text-[#85867c]">Loading calendar…</p> : <>
                    <div className="flex flex-col gap-4 border-b border-[#ecebe5] pb-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-label font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS PLANNING</p>
                        <h2 className="mt-3 font-serif text-2xl">{viewTitle(view, anchor)}</h2>
                        <p className="mt-2 text-meta text-[#96968b]">Japan Standard Time · {days ? `${days.length} tour days${filtered ? " (filtered)" : ""}` : "Loading…"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setAnchor(stepAnchor(view, anchor, -1))} aria-label="Previous" className="border border-[#deddd6] px-3 py-2 text-meta text-[#77786f] hover:bg-[#f8f7f3]">‹</button>
                        <button type="button" onClick={() => setAnchor(today)} className="border border-[#deddd6] px-3 py-2 text-meta text-[#77786f] hover:bg-[#f8f7f3]">Today</button>
                        <button type="button" onClick={() => setAnchor(stepAnchor(view, anchor, 1))} aria-label="Next" className="border border-[#deddd6] px-3 py-2 text-meta text-[#77786f] hover:bg-[#f8f7f3]">›</button>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex gap-1 bg-[#f8f7f3] p-1" role="tablist" aria-label="Calendar view">
                        {calendarViews.map((option) => (
                          <button key={option} type="button" role="tab" aria-selected={view === option} onClick={() => setView(option)} className={`px-3 py-2 text-meta ${view === option ? "bg-white text-[#292b26] shadow-sm" : "text-[#96968b]"}`}>{option}</button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-label text-[#85867c]">
                        <Legend tone="bg-[#cfc09b]" label="Needs guide / answer" />
                        <Legend tone="bg-[#bac8d0]" label="Payment & documents" />
                        <Legend tone="bg-[#b9c8b5]" label="Confirmed" />
                        <Legend tone="bg-[#d9b8ad]" label="Guides off" />
                        <label className="flex items-center gap-1.5"><input type="checkbox" checked={showCancelled} onChange={(event) => setShowCancelled(event.target.checked)} />Cancelled</label>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <label className="text-meta">Guide<Select value={filters.guideId} onChange={(guideId) => setFilters({ ...filters, guideId })} options={[{ value: "", label: "Any guide" }, ...guides.map((item) => ({ value: item.guide.id, label: item.guide.name }))]} className={filterClass} ariaLabel="Guide" /></label>
                      <label className="text-meta">Zone<Select value={filters.zoneId} onChange={(zoneId) => setFilters({ ...filters, zoneId })} options={[{ value: "", label: "Any zone" }, ...zones.filter((zone) => zone.is_active || zone.id === filters.zoneId).map((zone) => ({ value: zone.id, label: zone.name }))]} className={filterClass} ariaLabel="Zone" /></label>
                      <label className="text-meta">Status<Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={statusFilters.map(({ value, label }) => ({ value, label }))} className={filterClass} ariaLabel="Status" /></label>
                    </div>
                    {filtered && <button type="button" onClick={() => setFilters({ guideId: "", zoneId: "", status: "" })} className="mt-2 text-meta underline underline-offset-2">Clear filters</button>}

                    <OperationsCalendar view={view} anchor={anchor} days={days} timeOff={timeOff} today={today} guideName={guideName} zoneName={zoneName} />
                  </>}
                </section>
                <CalendarSummary days={days} today={today} guideName={guideName} offToday={timeOff.get(today) ?? []} inView={!!range && today >= range.first && today <= range.last} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function CalendarSummary({ days, today, guideName, offToday, inView }: { days: TourDay[] | null; today: string; guideName: (id: string | null) => string | null; offToday: string[]; inView: boolean }) {
  const active = (days ?? []).filter((day) => toneFor(day.status) !== "muted");
  const todays = active.filter((day) => toDayKey(day.start_datetime) === today);
  const count = (value: number) => (days ? String(value).padStart(2, "0") : "—");

  return (
    <aside className="space-y-5">
      <section className="bg-white p-5 sm:p-6">
        <p className="text-label font-semibold tracking-[0.2em] text-[#9b8353]">TODAY{today ? ` · ${formatJst(`${today}T00:00:00+09:00`, { day: "numeric", month: "short" }).toUpperCase()}` : ""}</p>
        <h2 className="mt-3 font-serif text-xl">Schedule</h2>
        <div className="mt-5 space-y-4">
          {/* Today's days are only listed while today is in the view. */}
          {days && !inView && <p className="text-meta text-[#96968b]">Today is not in this view.</p>}
          {days && inView && todays.length === 0 && <p className="text-meta text-[#96968b]">No tours today.</p>}
          {inView && todays.map((day) => (
            <Link key={day.id} href={`/tours/${day.id}`} className="block border-l-2 border-[#b9c8b5] pl-3 hover:bg-[#fbfaf7]"><p className="text-meta text-[#9b8353]">{formatJstClock(day.start_datetime)}</p><p className="mt-1 text-body">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-label text-[#85867c]">{[guideName(day.guide_id) ?? "No guide", day.people_count ? `${day.people_count} guests` : null].filter(Boolean).join(" · ")}</p></Link>
          ))}
        </div>
      </section>
      {inView && (
        <section className="bg-white p-5 sm:p-6">
          <p className="text-label font-semibold tracking-[0.2em] text-[#9b8353]">GUIDES OFF TODAY</p>
          {offToday.length === 0 ? <p className="mt-3 text-meta text-[#96968b]">Every guide is available.</p> : <p className="mt-3 text-body text-[#55574f]">{offToday.join(", ")}</p>}
        </section>
      )}
      <section className="bg-[#e9e5d7] p-5 sm:p-6">
        <p className="text-label font-semibold tracking-[0.2em] text-[#9b8353]">IN THIS VIEW</p>
        <div className="mt-5 space-y-4">
          <SummaryItem label="Scheduled tour days" value={count(active.length)} />
          <SummaryItem label="Without guide" value={count(active.filter((day) => !day.guide_id).length)} />
          <SummaryItem label="Preassigned" value={count(active.filter((day) => day.status === "GUIDE_PREASSIGNED").length)} />
          <SummaryItem label="Confirmed" value={count(active.filter((day) => day.status === "CONFIRMED" || day.status === "COMPLETED").length)} />
        </div>
      </section>
    </aside>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-[#d7d1c1] pb-3 text-body last:border-0 last:pb-0"><span>{label}</span><strong className="font-serif text-lg font-normal">{value}</strong></div>;
}
