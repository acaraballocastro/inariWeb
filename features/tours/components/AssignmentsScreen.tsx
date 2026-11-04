"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { listZones, type Zone } from "@/features/catalogs/api";
import { listGuides, type GuideDetail } from "@/features/guides/api";
import { assignGuide, listTourDays, type TourDay } from "@/features/tours/api";
import { formatDuration, formatJst, formatJstClock, toDayKey } from "@/lib/datetime";
import { withFallback } from "@/lib/missing";
import { formatStatus } from "@/lib/status";

// Days a guide can be assigned to: pending, preassigned (to change the guide) and
// paid days left without guide (they keep their status with the new one).
const assignableStatuses = ["PENDING_ASSIGNMENT", "GUIDE_PREASSIGNED", "VOUCHER_PENDING", "SIGNATURE_PENDING", "CONFIRMED"];

type View = "unassigned" | "awaiting";

export function AssignmentsScreen() {
  const [days, setDays] = useState<TourDay[] | null>(null);
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [view, setView] = useState<View>("unassigned");
  const [zoneFilter, setZoneFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [guideId, setGuideId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { missing, report } = useMissingData();
  const [isSaving, setIsSaving] = useState(false);

  const loadDays = useCallback(() => listTourDays({ from: toDayKey(new Date()), status: assignableStatuses }), []);

  useEffect(() => {
    let active = true;
    const failed: string[] = [];
    Promise.all([loadDays(), listGuides().then((items) => items ?? []), withFallback(listZones().then((items) => items ?? []), [], "zones", failed)])
      .then(([dayItems, guideItems, zoneItems]) => { if (active) { setDays(dayItems); setGuides(guideItems); setZones(zoneItems); failed.forEach(report); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the tour days."); });
    return () => { active = false; };
  }, [loadDays, report]);

  const visible = useMemo(() => (days ?? []).filter((day) => {
    const matchesView = view === "awaiting" ? day.status === "GUIDE_PREASSIGNED" : !day.guide_id;
    return matchesView && (!zoneFilter || day.zone_id === zoneFilter);
  }), [days, view, zoneFilter]);

  const groups = useMemo(() => {
    const byDate = new Map<string, TourDay[]>();
    for (const day of visible) {
      const key = toDayKey(new Date(day.start_datetime));
      byDate.set(key, [...(byDate.get(key) ?? []), day]);
    }
    return [...byDate.entries()];
  }, [visible]);

  const guideName = (id: string | null) => (id ? guides.find((item) => item.guide.id === id)?.guide.name ?? "Assigned guide" : null);
  const zoneName = (id: string | null) => (id ? zones.find((zone) => zone.id === id)?.name ?? null : null);
  const selectedDays = visible.filter((day) => selected.has(day.id));
  // Guides of the selected days' zones first; the rest stay available.
  const selectedZones = new Set(selectedDays.map((day) => day.zone_id).filter(Boolean));
  const sortedGuides = [...guides].sort((a, b) => Number(b.zones.some((zone) => selectedZones.has(zone.id))) - Number(a.zones.some((zone) => selectedZones.has(zone.id))) || a.guide.name.localeCompare(b.guide.name));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (!guideId || selectedDays.length === 0) return;
    setIsSaving(true); setError(""); setNotice("");
    try {
      await assignGuide(selectedDays.map((day) => day.id), guideId);
      setNotice(`${selectedDays.length} day${selectedDays.length === 1 ? "" : "s"} assigned to ${guideName(guideId)}.`);
      setSelected(new Set()); setGuideId("");
      setDays(await loadDays());
    } catch (requestError) {
      // The API validates every day before changing any, so nothing was assigned.
      setError(requestError instanceof Error ? requestError.message : "Could not assign the guide.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Assignments" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Assignments" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1190px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
              <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS / ASSIGNMENTS</p>
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Assignments</h1>
              <p className="mt-2 max-w-[600px] text-[11px] text-[#85867c]">Upcoming days without a guide and preassignments awaiting an answer. Select several days to assign them at once: the guide&apos;s blocked dates and daily limit are checked for all of them before any changes.</p>
            </header>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
              <section className="bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#ecebe5] pb-5">
                  <div className="flex gap-2">
                    {(["unassigned", "awaiting"] as View[]).map((option) => (
                      <button key={option} type="button" onClick={() => { setView(option); setSelected(new Set()); }} className={`h-8 px-3 text-[9px] ${view === option ? "bg-[#292b26] text-white" : "border border-[#deddd6] text-[#66685f] hover:bg-[#f8f7f3]"}`}>
                        {option === "unassigned" ? `Without guide (${(days ?? []).filter((day) => !day.guide_id).length})` : `Awaiting answer (${(days ?? []).filter((day) => day.status === "GUIDE_PREASSIGNED").length})`}
                      </button>
                    ))}
                  </div>
                  <label className="text-[9px]">Zone<select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)} className="ml-2 h-8 border border-[#e3e1da] bg-[#f8f7f3] px-2 text-[9px]"><option value="">All zones</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
                </div>

                {error && <p role="alert" className="mt-4 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-[10px] text-[#9b6f37]">{error}</p>}
                <MissingDataNotice missing={missing} className="mt-4" />
                {notice && <p className="mt-4 bg-[#eef0e9] p-3 text-[10px] text-[#68705d]">{notice}</p>}
                {!days && !error && <p className="mt-5 text-[10px] text-[#85867c]">Loading tour days...</p>}
                {days && groups.length === 0 && <p className="mt-5 text-[10px] text-[#85867c]">{view === "unassigned" ? "Every upcoming day has a guide." : "No preassignments waiting for an answer."}</p>}

                {groups.map(([date, items]) => (
                  <div key={date} className="mt-5">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{formatJst(items[0].start_datetime, { weekday: "long", day: "numeric", month: "long" })}</p>
                    <div className="mt-2 divide-y divide-[#f0efe9] border-y border-[#f0efe9]">
                      {items.map((day) => (
                        <label key={day.id} className="grid cursor-pointer grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-3 py-3 hover:bg-[#fbfaf7]">
                          <input type="checkbox" checked={selected.has(day.id)} onChange={() => toggle(day.id)} className="mt-0.5" />
                          <div className="min-w-0">
                            <Link href={`/tours/${day.id}`} onClick={(event) => event.stopPropagation()} className="text-[10px] hover:underline">{day.title || day.code || "Tour day"}</Link>
                            <p className="mt-1 text-[8px] text-[#85867c]">{[day.code, formatJstClock(day.start_datetime), formatDuration(day.duration), zoneName(day.zone_id) ?? "No zone", day.people_count ? `${day.people_count} guests` : null].filter(Boolean).join(" · ")}</p>
                            {day.status === "GUIDE_PREASSIGNED" && <p className="mt-1 text-[8px] text-[#9b8353]">Preassigned to {guideName(day.guide_id)}</p>}
                          </div>
                          <span className="bg-[#ebe7da] px-2 py-1 text-[8px] text-[#77786f]">{formatStatus(day.status)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <aside className="h-fit bg-white p-5 sm:p-6 xl:sticky xl:top-5">
                <h2 className="font-serif text-xl">Assign</h2>
                <p className="mt-2 text-[10px] text-[#85867c]">{selectedDays.length ? `${selectedDays.length} day${selectedDays.length === 1 ? "" : "s"} selected` : "Select days on the left."}</p>
                <label className="mt-4 block text-[9px]">Guide<select value={guideId} onChange={(event) => setGuideId(event.target.value)} disabled={isSaving} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px]"><option value="">Select a guide</option>{sortedGuides.map((item) => <option key={item.guide.id} value={item.guide.id}>{item.guide.name}{item.zones.length ? ` · ${item.zones.map((zone) => zone.name).join(", ")}` : ""}</option>)}</select></label>
                <button type="button" disabled={isSaving || !guideId || selectedDays.length === 0} onClick={handleAssign} className="mt-3 h-9 w-full bg-[#292b26] text-[9px] text-white hover:bg-[#41443b] disabled:opacity-50">{isSaving ? "Assigning..." : "Assign guide"}</button>
                {selectedDays.length > 0 && <button type="button" onClick={() => setSelected(new Set())} className="mt-2 text-[9px] underline underline-offset-2">Clear selection</button>}
                <p className="mt-4 text-[8px] leading-relaxed text-[#85867c]">Pending days become preassigned and the guide has 24 hours to answer. Paid days keep their status with the new guide.</p>
              </aside>
            </div>
          </div></div>
        </div>
      </div>
    </main>
  );
}

