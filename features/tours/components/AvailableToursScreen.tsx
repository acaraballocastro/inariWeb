"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listZones, type Zone } from "@/features/catalogs/api";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { getGuideByUser } from "@/features/guides/api";
import { listTourDaysAvailableForGuide, type TourDay } from "@/features/tours/api";
import { TourDayCard } from "@/features/tours/components/TourDayCard";
import { useTakeTourDay } from "@/features/tours/useTakeTourDay";
import { getSession } from "@/lib/api/client";
import { formatDayKey, toDayKey } from "@/lib/datetime";

/**
 * Every day offered to the guide (spec 4.3): of their zones or without zone,
 * without guide, of reservations offered to the guides. Tapping one opens
 * its detail and itinerary; "Take" preassigns it to them.
 */
export function AvailableToursScreen() {
  const takeDay = useTakeTourDay();
  const [days, setDays] = useState<TourDay[] | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneFilter, setZoneFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) return [];
    const guide = await getGuideByUser(session.userId);
    return listTourDaysAvailableForGuide(guide.id);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([load(), listZones().then((items) => items ?? []).catch(() => [])])
      .then(([dayItems, zoneItems]) => { if (active) { setDays(dayItems); setZones(zoneItems); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the available tours."); });
    return () => { active = false; };
  }, [load]);

  const zoneName = (id: string | null) => (id ? zones.find((zone) => zone.id === id)?.name ?? null : null);
  const zonesInList = useMemo(() => [...new Set((days ?? []).map((day) => day.zone_id ?? ""))], [days]);
  const visible = (days ?? []).filter((day) => !zoneFilter || (zoneFilter === "none" ? !day.zone_id : day.zone_id === zoneFilter));
  const groups = useMemo(() => {
    const byDay = new Map<string, TourDay[]>();
    for (const day of visible) {
      const key = toDayKey(new Date(day.start_datetime));
      byDay.set(key, [...(byDay.get(key) ?? []), day]);
    }
    return [...byDay.entries()];
  }, [visible]);

  async function take(day: TourDay) {
    setBusyId(day.id); setError(""); setNotice("");
    try {
      const outcome = await takeDay(day, zoneName(day.zone_id));
      if (!outcome) return;
      if (outcome.taken) setNotice(outcome.message); else setError(outcome.message);
      if (outcome.stale) setDays(await load());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not refresh the list.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Available tours" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Available tours" />
          <div className="px-4 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[860px]">
            <header className="pb-5 pt-6 sm:pt-10">
              <h1 className="font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Available tours</h1>
              <p className="mt-2 text-lead text-[#85867c]">Tours without a guide in your zones, and those without a zone. Open one to see its itinerary; take it and confirm it.</p>
              {zonesInList.length > 1 && (
                <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                  {[["", "All"], ...zonesInList.map((id) => [id || "none", id ? zoneName(id) ?? "Zone" : "No zone"])].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setZoneFilter(value)} className={`h-9 shrink-0 px-4 text-body ${zoneFilter === value ? "bg-[#292b26] text-white" : "border border-[#deddd6] bg-white text-[#66685f]"}`}>{label}</button>
                  ))}
                </div>
              )}
            </header>

            {error && <p role="alert" className="mb-4 bg-[#f4e4df] px-4 py-3 text-body text-[#8a3b2c]">{error}</p>}
            {notice && <p role="status" className="mb-4 bg-[#eef0e9] px-4 py-3 text-body text-[#68705d]">{notice}</p>}
            {days === null && !error && <p className="text-body text-[#85867c]">Loading…</p>}
            {days?.length === 0 && <p className="bg-white p-5 text-body text-[#85867c]">No tours available right now. You will get a notification when one is offered to you.</p>}

            <div className="space-y-5">
              {groups.map(([dayKey, items]) => (
                <section key={dayKey}>
                  <p className="mb-2 text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{formatDayKey(dayKey, { weekday: "long", day: "numeric", month: "long" })}</p>
                  <div className="space-y-2">
                    {items.map((day) => (
                      <TourDayCard key={day.id} day={day} zone={zoneName(day.zone_id)} note={day.zone_id ? undefined : "Open to every guide"}
                        action={<button type="button" disabled={busyId !== null} onClick={() => take(day)} className="h-10 bg-[#292b26] px-4 text-meta text-white disabled:opacity-60">{busyId === day.id ? "…" : "Take"}</button>} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div></div>
        </div>
      </div>
    </main>
  );
}
