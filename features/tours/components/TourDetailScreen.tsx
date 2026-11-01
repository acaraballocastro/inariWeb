"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { listZones, type Zone } from "@/features/catalogs/api";
import { listGuides, type GuideDetail } from "@/features/guides/api";
import { listReservations, type Reservation } from "@/features/reservations/api";
import { assignGuide, cancelTourDay, confirmTourDay, getTourDay, listActivities, listPlaces, unassignGuide, updateTourDay, type ItineraryActivity, type ItineraryPlace, type TourDay } from "@/features/tours/api";
import { ItineraryEditor } from "@/features/tours/components/ItineraryEditor";
import { TourDayForm, emptyTourDayDraft, toTourDayDraft, toTourDayInput, type TourDayDraft } from "@/features/tours/components/TourDayForm";
import { formatDuration, formatJst, formatJstClock } from "@/lib/datetime";

type TourDayContext = { tourDay: TourDay; reservation: Reservation | null; zones: Zone[]; guides: GuideDetail[]; places: ItineraryPlace[]; activities: ItineraryActivity[] };

async function loadTourDayContext(id: string): Promise<TourDayContext> {
  const [tourDay, zones, guides, reservations, places, activities] = await Promise.all([
    getTourDay(id),
    listZones().then((items) => items ?? []),
    listGuides().then((items) => items ?? []),
    listReservations().then((items) => items ?? []),
    listPlaces().catch(() => []),
    listActivities().catch(() => []),
  ]);
  return { tourDay, zones, guides, places, activities, reservation: reservations.find((item) => item.id === tourDay.reservation_id) ?? null };
}

export function TourDetailScreen({ tourDayId }: { tourDayId: string }) {
  const [context, setContext] = useState<TourDayContext | null>(null);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<TourDayDraft>(emptyTourDayDraft);

  // Actions only change the tour day, so the catalogues loaded on mount are reused.
  const refresh = useCallback(async () => {
    const tourDay = await getTourDay(tourDayId);
    setContext((current) => current && { ...current, tourDay });
    setDraft(toTourDayDraft(tourDay));
  }, [tourDayId]);

  useEffect(() => {
    let active = true;
    loadTourDayContext(tourDayId)
      .then((result) => { if (active) { setContext(result); setDraft(toTourDayDraft(result.tourDay)); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the tour day."); });
    return () => { active = false; };
  }, [tourDayId]);

  async function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setIsSaving(true); setError("");
    try { await action(); await refresh(); return true; } catch (requestError) { setError(requestError instanceof Error ? requestError.message : fallbackMessage); return false; } finally { setIsSaving(false); }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) return;
    const result = toTourDayInput(draft);
    if ("error" in result) { setError(result.error); return; }
    if (await runAction(() => updateTourDay(context.tourDay, result.input), "Could not update the tour day.")) setIsEditing(false);
  }

  function handleCancelTourDay() {
    if (!context || !window.confirm("Cancel this tour day? The guide and operations team will see it as cancelled.")) return;
    runAction(() => cancelTourDay(context.tourDay.id), "Could not cancel the tour day.");
  }

  const tourDay = context?.tourDay;
  const isCancelled = tourDay?.status === "CANCELLED" || tourDay?.status === "FORCE_MAJEURE_CANCELLED";

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Reservations" />

        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Reservations / Tour day" />

          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="pb-6 pt-8 sm:pt-10">
                <Link href={context?.reservation ? `/reservations/${encodeURIComponent(context.reservation.code ?? context.reservation.id)}` : "/reservations"} className="inline-flex bg-[#e9e5d7] px-3 py-2 text-[9px] text-[#5d5e55] transition-colors hover:bg-[#ded8c7]">← {context?.reservation ? "Back to reservation" : "Reservations"}</Link>
                {error && <p role="alert" className="mt-6 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-[10px] text-[#9b6f37]">{error}<button type="button" onClick={() => setError("")} className="ml-3 underline">Dismiss</button></p>}
                {!context && !error && <p className="mt-6 text-[10px] text-[#85867c]">Loading tour day...</p>}
                {tourDay && (
                  <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9b8353]">TOUR DAY / {formatLongDate(tourDay.start_datetime)}</p>
                      <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[38px]">{tourDay.title || "Untitled tour day"}</h1>
                      <p className="mt-2 text-[11px] text-[#85867c]">{context.reservation?.title ? `Part of ${context.reservation.title}.` : "Operational day linked to a reservation."}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[9px]">
                      <span className="bg-[#e9e5d7] px-3 py-2 text-[#77786f]">{formatStatus(tourDay.status)}</span>
                      <span className="border border-[#deddd6] px-3 py-2 text-[#85867c]">{tourDay.code || tourDay.id.slice(0, 8)}</span>
                      {tourDay.status === "GUIDE_PREASSIGNED" && <button type="button" disabled={isSaving} onClick={() => runAction(() => confirmTourDay(tourDay.id), "Could not confirm the tour day.")} className="h-8 bg-[#292b26] px-3 text-white hover:bg-[#41443b] disabled:opacity-60">Confirm guide</button>}
                      {!isCancelled && <button type="button" disabled={isSaving} onClick={handleCancelTourDay} className="h-8 border border-[#deddd6] px-3 text-[#9b6f37] hover:bg-[#fbf6ef] disabled:opacity-60">Cancel tour day</button>}
                    </div>
                  </div>
                )}
              </header>

              {context && tourDay && (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
                  <div className="space-y-5">
                    <TourOverview context={context} isEditing={isEditing} draft={draft} isSaving={isSaving} onEdit={() => setIsEditing(true)} onChange={setDraft} onSave={handleSave} onCancel={() => { setIsEditing(false); setDraft(toTourDayDraft(tourDay)); }} />
                    <ItineraryPanel tourDay={tourDay} places={context.places} activities={context.activities} />
                  </div>
                  <div className="space-y-5">
                    <AssignmentPanel tourDay={tourDay} guides={context.guides} disabled={isSaving || isCancelled} onAssign={(guideId) => runAction(() => assignGuide([tourDay.id], guideId), "Could not assign the guide.")} onUnassign={(guideId) => runAction(() => unassignGuide([tourDay.id], guideId), "Could not unassign the guide.")} />
                    <TourResources tourDay={tourDay} />
                    <TourHistory tourDay={tourDay} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TourOverview({ context, isEditing, draft, isSaving, onEdit, onChange, onSave, onCancel }: { context: TourDayContext; isEditing: boolean; draft: TourDayDraft; isSaving: boolean; onEdit: () => void; onChange: (draft: TourDayDraft) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const { tourDay, reservation, zones } = context;
  const zone = zones.find((item) => item.id === tourDay.zone_id);
  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ecebe5] pb-5">
        <div><h2 className="font-serif text-xl">Tour overview</h2><p className="mt-2 text-[10px] text-[#85867c]">The operational details for this experience.</p></div>
        {!isEditing && <button type="button" onClick={onEdit} className="h-9 border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]">Edit</button>}
      </div>
      {isEditing ? <TourDayForm draft={draft} zones={zones} onChange={onChange} onSubmit={onSave} onCancel={onCancel} isSaving={isSaving} submitLabel="Save changes" /> : (
        <div className="grid gap-x-8 gap-y-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Date" value={formatWeekdayDate(tourDay.start_datetime)} />
          <Info label="Time" value={`${formatTime(tourDay.start_datetime)}${tourDay.duration ? ` · ${formatDuration(tourDay.duration)}` : ""}`} />
          <Info label="Guests" value={tourDay.people_count ? `${tourDay.people_count} travellers` : "Not provided"} />
          <Info label="Zone" value={zone?.name ?? "Unassigned"} />
          <Info label="Reservation" value={reservation ? <Link href={`/reservations/${encodeURIComponent(reservation.code ?? reservation.id)}`} className="hover:underline">{reservation.code ?? reservation.id}</Link> : tourDay.reservation_id} />
          <Info label="Meeting point" value={tourDay.meeting_point || "Not provided"} />
        </div>
      )}
    </section>
  );
}

function AssignmentPanel({ tourDay, guides, disabled, onAssign, onUnassign }: { tourDay: TourDay; guides: GuideDetail[]; disabled: boolean; onAssign: (guideId: string) => void; onUnassign: (guideId: string) => void }) {
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const assigned = guides.find((item) => item.guide.id === tourDay.guide_id);

  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Guide assignment</h2>
      {tourDay.guide_id ? (
        <>
          <div className="mt-5 flex items-center gap-3 border-b border-[#ecebe5] pb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9e5d7] font-serif text-lg">{initials(assigned?.guide.name ?? "?")}</span>
            <div className="min-w-0"><p className="text-[11px]">{assigned ? <Link href={`/guides/${assigned.guide.id}`} className="hover:underline">{assigned.guide.name}</Link> : tourDay.guide_id}</p><p className="mt-1 text-[9px] text-[#85867c]">{assigned ? describeGuide(assigned) : "Guide details unavailable"}</p></div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[9px]"><span className="text-[#85867c]">Assignment status</span><span className="bg-[#e9e5d7] px-3 py-1 text-[#77786f]">{formatStatus(tourDay.status)}</span></div>
          <button type="button" disabled={disabled} onClick={() => tourDay.guide_id && onUnassign(tourDay.guide_id)} className="mt-5 h-9 w-full border border-[#deddd6] text-[9px] hover:bg-[#f8f7f3] disabled:opacity-50">Unassign guide</button>
        </>
      ) : (
        <>
          <p className="mt-4 text-[10px] text-[#85867c]">No guide assigned yet.</p>
          <label className="mt-4 block text-[9px]">Guide<select value={selectedGuideId} onChange={(event) => setSelectedGuideId(event.target.value)} disabled={disabled} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]"><option value="">Select a guide</option>{guides.map((item) => <option key={item.guide.id} value={item.guide.id}>{item.guide.name}</option>)}</select></label>
          <button type="button" disabled={disabled || !selectedGuideId} onClick={() => onAssign(selectedGuideId)} className="mt-3 h-9 w-full bg-[#292b26] text-[9px] text-white hover:bg-[#41443b] disabled:opacity-50">Assign guide</button>
        </>
      )}
    </section>
  );
}

function ItineraryPanel({ tourDay, places, activities }: { tourDay: TourDay; places: ItineraryPlace[]; activities: ItineraryActivity[] }) {
  const [stopCount, setStopCount] = useState(0);
  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-xl">Day itinerary</h2><p className="mt-2 text-[10px] text-[#85867c]">A considered route, arranged from morning to afternoon.</p></div><span className="text-[9px] text-[#9b8353]">{stopCount} STOPS</span></div>
      <ItineraryEditor tourDay={tourDay} places={places} activities={activities} onCountChange={setStopCount} />
    </section>
  );
}

function TourResources({ tourDay }: { tourDay: TourDay }) {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Tour resources</h2>
      <div className="mt-5 space-y-4">
        <Resource label="Voucher" value={formatStatus(tourDay.voucher_status)} />
        <Resource label="Remuneration" value={tourDay.remuneration == null ? "Not provided" : new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(tourDay.remuneration)} />
        <Resource label="Guide notes" value={tourDay.guide_liability_notes || "No notes"} />
        <Resource label="Customer notes" value={tourDay.customer_liability_notes || "No notes"} />
      </div>
    </section>
  );
}

function TourHistory({ tourDay }: { tourDay: TourDay }) {
  const history = [["Updated", formatShortDateTime(tourDay.updated_at), "Last change registered for this tour day."], ["Created", formatShortDateTime(tourDay.created_at), "Tour day added to the reservation."]];
  return (
    <section id="assignment-history" className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Recent activity</h2>
      <div className="mt-5 space-y-5">{history.map(([title, time, detail]) => <div key={title} className="grid grid-cols-[64px_1fr] gap-3 text-[9px]"><span className="text-[#9b8353]">{time}</span><div><p>{title}</p><p className="mt-1 leading-relaxed text-[#85867c]">{detail}</p></div></div>)}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div><p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{label}</p><p className="mt-2 break-words text-[10px] text-[#55574f]">{value}</p></div>;
}

function Resource({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-[#ecebe5] pb-3 last:border-0 last:pb-0"><p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{label}</p><p className="mt-2 whitespace-pre-line text-[10px] text-[#85867c]">{value}</p></div>;
}

function describeGuide(detail: GuideDetail) {
  const zones = (detail.zones ?? []).map((zone) => zone.name).join(", ");
  const languages = (detail.languages ?? []).map((language) => language.name).join(", ");
  return [zones, languages].filter(Boolean).join(" · ") || detail.guide.email;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function formatLongDate(value: string) { return formatJst(value, { day: "numeric", month: "long", year: "numeric" }); }
function formatWeekdayDate(value: string) { return formatJst(value, { weekday: "long", day: "numeric", month: "long" }); }
function formatTime(value: string) { return formatJstClock(value); }
function formatShortDateTime(value: string) { return formatJst(value, { day: "2-digit", month: "short" }); }
function formatStatus(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
