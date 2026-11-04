"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { listZones, type Zone } from "@/features/catalogs/api";
import { getGuideByUser } from "@/features/guides/api";
import { confirmTourDay, listTourDays, listTourDaysAvailableForGuide, rejectTourDay, type TourDay } from "@/features/tours/api";
import { getSession } from "@/lib/api/client";
import { formatDuration, toDayKey } from "@/lib/datetime";
import { withFallback } from "@/lib/missing";
import { formatStatus, isCancelled } from "@/lib/status";
import { MissingDataNotice } from "./MissingDataNotice";
import { formatClock, formatShortDate } from "../api";

type GuideData = { mine: TourDay[]; open: TourDay[]; zones: Zone[]; missing: string[] };


// The API only returns a guide's own days, so the list needs no guide filter.
async function loadGuideData(now: Date): Promise<GuideData> {
  const session = getSession();
  if (!session) return { mine: [], open: [], zones: [], missing: [] };
  const guide = await getGuideByUser(session.userId);
  const missing: string[] = [];
  const [mine, open, zones] = await Promise.all([
    listTourDays({ from: toDayKey(now) }),
    withFallback(listTourDaysAvailableForGuide(guide.id), [], "open tour days", missing),
    withFallback(listZones().then((items) => items ?? []), [], "zones", missing),
  ]);
  return { mine: mine.filter((day) => !isCancelled(day.status)), open, zones, missing };
}

export function GuideDashboard({ now }: { now: Date | null }) {
  const { confirm } = useDialogs();
  const [data, setData] = useState<GuideData | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!now) return;
    setData(await loadGuideData(now));
  }, [now]);

  useEffect(() => {
    if (!now) return;
    let active = true;
    loadGuideData(now)
      .then((result) => { if (active) setData(result); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load your tours."); });
    return () => { active = false; };
  }, [now]);

  async function respond(day: TourDay, accept: boolean) {
    if (!accept && !await confirm({ title: "Decline this tour?", message: "It will be offered to other guides.", confirmLabel: "Decline tour", cancelLabel: "Keep it", tone: "danger" })) return;
    setBusyId(day.id); setError("");
    try {
      await (accept ? confirmTourDay(day.id) : rejectTourDay(day.id));
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send your answer.");
    } finally {
      setBusyId(null);
    }
  }

  const zoneName = (id: string | null) => (id ? data?.zones.find((zone) => zone.id === id)?.name ?? null : null);
  const pending = data?.mine.filter((day) => day.status === "GUIDE_PREASSIGNED") ?? null;
  const upcoming = data?.mine.filter((day) => day.status !== "GUIDE_PREASSIGNED") ?? null;
  const today = now ? toDayKey(now) : "";
  const todayCount = data?.mine.filter((day) => toDayKey(new Date(day.start_datetime)) === today).length;

  return (
    <>
      {error && <p role="alert" className="mb-5 bg-[#f4e4df] px-4 py-3 text-[10px] text-[#8a3b2c]">{error}</p>}
      <MissingDataNotice missing={data?.missing ?? []} className="mb-5" />

      <div className="grid grid-cols-3 gap-3">
        {[["Today", todayCount], ["Awaiting your answer", pending?.length], ["Upcoming", upcoming?.length]].map(([label, value]) => (
          <article key={String(label)} className="min-h-[90px] bg-white p-4"><p className="text-[9px] text-[#8b8c82]">{label}</p><p className="mt-3 font-serif text-2xl leading-none">{value == null ? "—" : String(value).padStart(2, "0")}</p></article>
        ))}
      </div>

      <section className="mt-5 bg-[#e9e5d7] p-5 sm:p-6">
        <p className="text-[9px] font-semibold tracking-[0.18em] text-[#9b8353]">AWAITING YOUR ANSWER</p>
        <p className="mt-2 text-[10px] text-[#5d5e55]">Without an answer within 24 hours a preassignment counts as accepted.</p>
        {pending === null && <p className="mt-4 text-[10px] text-[#85867c]">Loading…</p>}
        {pending?.length === 0 && <p className="mt-4 text-[10px] text-[#85867c]">Nothing pending.</p>}
        <div className="mt-4 space-y-3">
          {pending?.map((day) => (
            <article key={day.id} className="flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/tours/${day.id}`} className="min-w-0 hover:underline"><p className="text-[11px]">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-[9px] text-[#85867c]">{describe(day, zoneName(day.zone_id))}</p></Link>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={busyId !== null} onClick={() => respond(day, true)} className="h-9 bg-[#292b26] px-4 text-[9px] text-white hover:bg-[#41443b] disabled:opacity-60">{busyId === day.id ? "Sending…" : "Accept"}</button>
                <button type="button" disabled={busyId !== null} onClick={() => respond(day, false)} className="h-9 border border-[#deddd6] px-4 text-[9px] hover:bg-[#f8f7f3] disabled:opacity-60">Decline</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <section className="bg-white p-5 sm:p-6">
          <h2 className="font-serif text-xl">My upcoming tours</h2>
          {upcoming === null && <p className="mt-4 text-[10px] text-[#85867c]">Loading…</p>}
          {upcoming?.length === 0 && <p className="mt-4 text-[10px] text-[#85867c]">No upcoming tours.</p>}
          <div className="mt-4 divide-y divide-[#f0efe9]">
            {upcoming?.map((day) => (
              <Link key={day.id} href={`/tours/${day.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-[#faf9f6]">
                <div className="min-w-0"><p className="text-[10px]">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-[8px] text-[#a2a299]">{describe(day, zoneName(day.zone_id))}</p></div>
                <span className="shrink-0 bg-[#ebe7da] px-2 py-1 text-[8px] text-[#77786f]">{formatStatus(day.status)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white p-5 sm:p-6">
          <h2 className="font-serif text-xl">Open tour days</h2>
          <p className="mt-2 text-[10px] text-[#85867c]">Days without a guide that fit your availability. Tell operations if you want one.</p>
          {data === null && <p className="mt-4 text-[10px] text-[#85867c]">Loading…</p>}
          {data?.open.length === 0 && <p className="mt-4 text-[10px] text-[#85867c]">No open days right now.</p>}
          <div className="mt-4 divide-y divide-[#f0efe9]">
            {data?.open.slice(0, 12).map((day) => (
              <div key={day.id} className="py-3"><p className="text-[10px]">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-[8px] text-[#a2a299]">{describe(day, zoneName(day.zone_id))}</p></div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function describe(day: TourDay, zone: string | null) {
  return [formatShortDate(day.start_datetime), formatClock(day.start_datetime), formatDuration(day.duration), zone, day.people_count ? `${day.people_count} guests` : null].filter(Boolean).join(" · ");
}
