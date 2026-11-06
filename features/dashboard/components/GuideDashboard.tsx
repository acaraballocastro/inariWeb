"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { usePreassignmentHours } from "@/features/settings/api";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { listZones, type Zone } from "@/features/catalogs/api";
import { getGuideByUser } from "@/features/guides/api";
import { useTakeTourDay } from "@/features/tours/useTakeTourDay";
import { checkInTourDay, isInProgress, listTourDays, offersCheckIn, listTourDaysAvailableForGuide, rejectTourDay, type TourDay } from "@/features/tours/api";
import { getSession } from "@/lib/api/client";
import { formatDuration, toDayKey } from "@/lib/datetime";
import { withFallback } from "@/lib/missing";
import { formatGuideStatus, isCancelled } from "@/lib/status";
import { InstallBanner } from "@/features/pwa/InstallBanner";
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
  const takeDay = useTakeTourDay();
  const hours = usePreassignmentHours();
  const [data, setData] = useState<GuideData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  // Preassignments are accepted automatically after the answer window (settings): guides only decline.
  async function decline(day: TourDay) {
    if (!await confirm({ title: "Decline this tour?", message: "It will be offered to other guides.", confirmLabel: "Decline tour", cancelLabel: "Keep it", tone: "danger" })) return;
    setBusyId(day.id); setError(""); setNotice("");
    try {
      await rejectTourDay(day.id);
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send your answer.");
    } finally {
      setBusyId(null);
    }
  }

  async function checkIn(day: TourDay) {
    setBusyId(day.id); setError(""); setNotice("");
    try {
      await checkInTourDay(day.id);
      setNotice(`Checked in: ${day.title || day.code || "the tour"} is in progress. Have a good tour.`);
      await reload();
    } catch (requestError) {
      // e.g. "check-in opens at 07:00 on 1 Dec (Japan time)".
      setError(requestError instanceof Error ? requestError.message : "Could not check in.");
    } finally {
      setBusyId(null);
    }
  }

  // Taking a day is a preassignment: it moves to "Preassigned".
  async function take(day: TourDay) {
    setBusyId(day.id); setError(""); setNotice("");
    try {
      const outcome = await takeDay(day, zoneName(day.zone_id));
      if (!outcome) return;
      if (outcome.taken) setNotice(outcome.message); else setError(outcome.message);
      if (outcome.stale) await reload().catch(() => undefined);
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
      {error && <p role="alert" className="mb-5 bg-[#f4e4df] px-4 py-3 text-body text-[#8a3b2c]">{error}</p>}
      {notice && <p role="status" className="mb-5 bg-[#eef0e9] px-4 py-3 text-body text-[#68705d]">{notice}<button type="button" onClick={() => setNotice("")} className="ml-3 underline">Dismiss</button></p>}
      <MissingDataNotice missing={data?.missing ?? []} className="mb-5" />
      <InstallBanner className="mb-5" />

      <div className="grid grid-cols-3 gap-3">
        {[["Today", todayCount], ["Preassigned", pending?.length], ["Upcoming", upcoming?.length]].map(([label, value]) => (
          <article key={String(label)} className="min-h-[90px] bg-white p-4"><p className="text-meta text-[#8b8c82]">{label}</p><p className="mt-3 font-serif text-2xl leading-none">{value == null ? "—" : String(value).padStart(2, "0")}</p></article>
        ))}
      </div>

      <section className="mt-5 bg-[#e9e5d7] p-5 sm:p-6">
        <p className="text-meta font-semibold tracking-[0.18em] text-[#9b8353]">PREASSIGNED</p>
        <p className="mt-2 text-body text-[#5d5e55]">Without an answer within {hours} hours a preassignment counts as accepted.</p>
        {pending === null && <p className="mt-4 text-body text-[#85867c]">Loading…</p>}
        {pending?.length === 0 && <p className="mt-4 text-body text-[#85867c]">Nothing pending.</p>}
        <div className="mt-4 space-y-3">
          {pending?.map((day) => (
            <article key={day.id} className="flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/tours/${day.id}`} className="min-w-0 hover:underline"><p className="text-lead">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-meta text-[#85867c]">{describe(day, zoneName(day.zone_id))}</p></Link>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={busyId !== null} onClick={() => decline(day)} className="h-9 border border-[#deddd6] px-4 text-meta hover:bg-[#f8f7f3] disabled:opacity-60">{busyId === day.id ? "Sending…" : "Decline"}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <section className="bg-white p-5 sm:p-6">
          <h2 className="font-serif text-xl">My upcoming tours</h2>
          {upcoming === null && <p className="mt-4 text-body text-[#85867c]">Loading…</p>}
          {upcoming?.length === 0 && <p className="mt-4 text-body text-[#85867c]">No upcoming tours.</p>}
          <div className="mt-4 divide-y divide-[#f0efe9]">
            {upcoming?.map((day) => (
              <div key={day.id} className="flex items-center justify-between gap-3 py-3 hover:bg-[#faf9f6]">
                <Link href={`/tours/${day.id}`} className="min-w-0 flex-1"><p className="text-body hover:underline">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-label text-[#a2a299]">{describe(day, zoneName(day.zone_id))}</p></Link>
                {now && offersCheckIn(day, now)
                  ? <button type="button" disabled={busyId !== null} onClick={() => checkIn(day)} className="h-8 shrink-0 bg-[#292b26] px-3 text-meta text-white hover:bg-[#41443b] disabled:opacity-60">{busyId === day.id ? "Checking in…" : "Check in"}</button>
                  : <span className={`shrink-0 px-2 py-1 text-label ${isInProgress(day) ? "bg-[#eef0e9] text-[#68705d]" : "bg-[#ebe7da] text-[#77786f]"}`}>{isInProgress(day) ? "In progress" : formatGuideStatus(day.status)}</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-5 sm:p-6">
          <h2 className="font-serif text-xl">Open tour days</h2>
          <p className="mt-2 text-body text-[#85867c]">Days without a guide in your zones, or without a zone. Take one and confirm it.</p>
          {data === null && <p className="mt-4 text-body text-[#85867c]">Loading…</p>}
          {data?.open.length === 0 && <p className="mt-4 text-body text-[#85867c]">No open days right now.</p>}
          <div className="mt-4 divide-y divide-[#f0efe9]">
            {data?.open.slice(0, 5).map((day) => (
              <div key={day.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/tours/${day.id}`} className="min-w-0 flex-1"><p className="text-body hover:underline">{day.title || day.code || "Tour day"}</p><p className="mt-1 text-label text-[#a2a299]">{describe(day, zoneName(day.zone_id))}</p></Link>
                <button type="button" disabled={busyId !== null} onClick={() => take(day)} className="h-8 shrink-0 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3] disabled:opacity-60">{busyId === day.id ? "Taking…" : "Take"}</button>
              </div>
            ))}
          </div>
          {data && data.open.length > 0 && <Link href="/available" className="mt-3 inline-block text-meta underline underline-offset-2">{data.open.length > 5 ? `See all ${data.open.length} available tours` : "See available tours"}</Link>}
        </section>
      </div>
    </>
  );
}

function describe(day: TourDay, zone: string | null) {
  return [formatShortDate(day.start_datetime), formatClock(day.start_datetime), formatDuration(day.duration), zone, day.people_count ? `${day.people_count} guests` : null].filter(Boolean).join(" · ");
}
