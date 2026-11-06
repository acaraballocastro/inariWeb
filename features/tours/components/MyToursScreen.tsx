"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listZones, type Zone } from "@/features/catalogs/api";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { DateInput } from "@/features/dashboard/components/DateInput";
import { checkInTourDay, listTourDays, listTourDaysPage, offersCheckIn, type TourDay } from "@/features/tours/api";
import { TourDayCard } from "@/features/tours/components/TourDayCard";
import { formatDayKey, startOfJstDay, toDayKey } from "@/lib/datetime";
import { useNow } from "@/lib/useNow";

type View = "upcoming" | "past";

const pageSize = 30;
const dayMs = 24 * 60 * 60 * 1000;

function daysBefore(today: string, days: number) {
  return toDayKey(new Date(startOfJstDay(today).getTime() - days * dayMs));
}

/**
 * The guide's tours (spec 4.4): upcoming ones, oldest first and paged, and
 * past ones in a date range, newest first. The API only answers the guide's
 * own days. Today's days offer the check-in.
 */
export function MyToursScreen() {
  const [view, setView] = useState<View>("upcoming");
  const [days, setDays] = useState<TourDay[] | null>(null);
  const [total, setTotal] = useState(0);
  const [zones, setZones] = useState<Zone[]>([]);
  const now = useNow();
  const today = now ? toDayKey(now) : null;
  // Empty: the last 90 days.
  const [fromChoice, setFrom] = useState("");
  const [toChoice, setTo] = useState("");
  const from = fromChoice || (today ? daysBefore(today, 90) : "");
  const to = toChoice || (today ? daysBefore(today, 1) : "");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { listZones().then((items) => setZones(items ?? [])).catch(() => undefined); }, []);

  const load = useCallback(async (): Promise<{ items: TourDay[]; total: number } | null> => {
    if (!today) return null;
    const todayStart = startOfJstDay(today);
    if (view === "upcoming") return listTourDaysPage({ from: todayStart.toISOString() }, { limit: pageSize, offset: 0 });
    // A range of past days, the most recent first.
    const end = new Date(Math.min(startOfJstDay(to).getTime() + dayMs, todayStart.getTime()));
    const items = await listTourDays({ from: startOfJstDay(from).toISOString(), to: end.toISOString() });
    return { items: items.reverse(), total: items.length };
  }, [view, from, to, today]);

  useEffect(() => {
    let active = true;
    load()
      .then((page) => { if (active && page) { setDays(page.items); setTotal(page.total); setError(""); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load your tours."); });
    return () => { active = false; };
  }, [load]);

  async function loadMore() {
    if (!days || !today) return;
    setIsLoadingMore(true);
    try {
      const todayStart = startOfJstDay(today);
      const page = await listTourDaysPage({ from: todayStart.toISOString() }, { limit: pageSize, offset: days.length });
      setDays((current) => [...(current ?? []), ...page.items.filter((item) => !current?.some((day) => day.id === item.id))]);
      setTotal(page.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load more tours.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function checkIn(day: TourDay) {
    setBusyId(day.id); setError(""); setNotice("");
    try {
      const updated = await checkInTourDay(day.id);
      setDays((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? null);
      setNotice(`Checked in: ${day.title || day.code || "the tour"} is in progress.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not check in.");
    } finally {
      setBusyId(null);
    }
  }

  const zoneName = (id: string | null) => (id ? zones.find((zone) => zone.id === id)?.name ?? null : null);
  const groups = useMemo(() => {
    const byDay = new Map<string, TourDay[]>();
    for (const day of days ?? []) {
      const key = toDayKey(new Date(day.start_datetime));
      byDay.set(key, [...(byDay.get(key) ?? []), day]);
    }
    return [...byDay.entries()];
  }, [days]);

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="My tours" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / My tours" />
          <div className="px-4 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[860px]">
            <header className="pb-5 pt-6 sm:pt-10">
              <h1 className="font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">My tours</h1>
              <div className="mt-4 grid grid-cols-2 gap-1 bg-[#e9e5d7] p-1 sm:inline-grid">
                {(["upcoming", "past"] as View[]).map((option) => (
                  <button key={option} type="button" onClick={() => { setView(option); setDays(null); }} className={`h-9 px-5 text-body ${view === option ? "bg-white font-medium" : "text-[#77786f]"}`}>{option === "upcoming" ? "Upcoming" : "Past"}</button>
                ))}
              </div>
              {view === "past" && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-[420px]">
                  <label className="text-meta">From<DateInput value={from} onChange={(value) => { if (value) { setFrom(value); setDays(null); } }} max={to} className="mt-2 h-10 w-full border border-[#e3e1da] bg-white px-3 text-body outline-none" ariaLabel="From" /></label>
                  <label className="text-meta">To<DateInput value={to} onChange={(value) => { if (value) { setTo(value); setDays(null); } }} min={from} max={today ? daysBefore(today, 1) : undefined} className="mt-2 h-10 w-full border border-[#e3e1da] bg-white px-3 text-body outline-none" ariaLabel="To" /></label>
                </div>
              )}
            </header>

            {error && <p role="alert" className="mb-4 bg-[#f4e4df] px-4 py-3 text-body text-[#8a3b2c]">{error}</p>}
            {notice && <p role="status" className="mb-4 bg-[#eef0e9] px-4 py-3 text-body text-[#68705d]">{notice}</p>}
            {days === null && !error && <p className="text-body text-[#85867c]">Loading…</p>}
            {days?.length === 0 && <p className="bg-white p-5 text-body text-[#85867c]">{view === "upcoming" ? "No upcoming tours. Look at the available ones to take one." : "No tours in these dates."}</p>}

            <div className="space-y-5">
              {groups.map(([dayKey, items]) => (
                <section key={dayKey}>
                  <p className="mb-2 text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{dayKey === today ? "Today" : formatDayKey(dayKey, { weekday: "long", day: "numeric", month: "long" })}</p>
                  <div className="space-y-2">
                    {items.map((day) => (
                      <TourDayCard key={day.id} day={day} zone={zoneName(day.zone_id)}
                        action={now && offersCheckIn(day, now) ? <button type="button" disabled={busyId !== null} onClick={() => checkIn(day)} className="h-10 bg-[#292b26] px-4 text-meta text-white disabled:opacity-60">{busyId === day.id ? "…" : "Check in"}</button> : undefined} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {view === "upcoming" && days && days.length < total && (
              <button type="button" disabled={isLoadingMore} onClick={loadMore} className="mt-5 h-11 w-full border border-[#deddd6] bg-white text-body disabled:opacity-50">{isLoadingMore ? "Loading…" : `Show more (${days.length} of ${total})`}</button>
            )}
          </div></div>
        </div>
      </div>
    </main>
  );
}
