"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { Combobox } from "@/features/dashboard/components/Combobox";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice } from "@/features/dashboard/components/MissingDataNotice";
import { listZones, type Zone } from "@/features/catalogs/api";
import { listGuides, type GuideDetail } from "@/features/guides/api";
import { TourDayIncidents } from "@/features/incidents/components/TourDayIncidents";
import { getReservationDetail, listReservations, type Reservation } from "@/features/reservations/api";
import { assignGuide, cancelTourDay, completeTourDay, confirmTourDay, forceMajeureTourDay, getTourDay, getTourDayHistory, listItineraryActivities, listItineraryPlaces, rejectTourDay, unassignGuide, updateTourDay, type ItineraryActivity, type ItineraryPlace, type TourDay } from "@/features/tours/api";
import { HistoryTimeline } from "@/features/tours/components/HistoryTimeline";
import { ItineraryEditor } from "@/features/tours/components/ItineraryEditor";
import { TourDayForm, emptyTourDayDraft, toTourDayDraft, toTourDayInput, type TourDayDraft } from "@/features/tours/components/TourDayForm";
import { ApiError, getSession, isAdmin } from "@/lib/api/client";
import { useSession } from "@/lib/api/useSession";
import { formatDuration, formatJst, formatJstClock, toDayKey } from "@/lib/datetime";
import { withFallback } from "@/lib/missing";
import { finalStatuses, formatStatus, paidStatuses } from "@/lib/status";

type TourDayContext = { tourDay: TourDay; reservation: Reservation | null; zones: Zone[]; guides: GuideDetail[]; places: ItineraryPlace[]; activities: ItineraryActivity[]; missing: string[] };

// A guide reads the day, its catalogues and itinerary; reservations and guides are admin-only.
async function loadTourDayContext(id: string): Promise<TourDayContext> {
  const admin = isAdmin(getSession());
  const missing: string[] = [];
  const [tourDay, zones, guides, places, activities] = await Promise.all([
    getTourDay(id),
    listZones().then((items) => items ?? []),
    admin ? listGuides().then((items) => items ?? []) : Promise.resolve([]),
    withFallback(listItineraryPlaces(), [], "places", missing),
    withFallback(listItineraryActivities(), [], "activities", missing),
  ]);
  const reservation = admin ? await withFallback(findReservation(tourDay), null, "the reservation", missing) : null;
  return { tourDay, zones, guides, places, activities, reservation, missing };
}

// Day codes are "<reservation code>-<n>", so the reservation is read by its code;
// days without a code fall back to the reservations overlapping the day's date.
async function findReservation(tourDay: TourDay): Promise<Reservation | null> {
  const code = tourDay.code?.match(/^(.+)-\d+$/)?.[1];
  if (code) {
    const detail = await getReservationDetail(code).catch(() => null);
    if (detail?.reservation.id === tourDay.reservation_id) return detail.reservation;
  }
  const day = toDayKey(new Date(tourDay.start_datetime));
  const reservations = await listReservations({ from: day, to: day });
  return reservations.find((item) => item.id === tourDay.reservation_id) ?? null;
}

export function TourDetailScreen({ tourDayId }: { tourDayId: string }) {
  const session = useSession();
  const admin = isAdmin(session);
  const { confirm, prompt } = useDialogs();
  const [context, setContext] = useState<TourDayContext | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<TourDayDraft>(emptyTourDayDraft);

  // Actions only change the tour day, so the catalogues loaded on mount are reused.
  const refresh = useCallback(async () => {
    const tourDay = await getTourDay(tourDayId);
    setContext((current) => current && { ...current, tourDay });
    setDraft(toTourDayDraft(tourDay));
    setHistoryVersion((current) => current + 1);
  }, [tourDayId]);

  const loadHistory = useCallback(() => getTourDayHistory(tourDayId), [tourDayId]);

  useEffect(() => {
    let active = true;
    loadTourDayContext(tourDayId)
      .then((result) => { if (active) { setContext(result); setDraft(toTourDayDraft(result.tourDay)); } })
      .catch((requestError: unknown) => {
        if (!active) return;
        // A guide opening a notification about a day that is no longer theirs.
        if (requestError instanceof ApiError && requestError.status === 403 && !isAdmin(getSession())) setError("This tour day is no longer assigned to you.");
        else setError(requestError instanceof Error ? requestError.message : "Could not load the tour day.");
      });
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

  async function handleCancelTourDay() {
    if (!context || !await confirm({ title: "Cancel this tour day?", message: "The guide and the operations team will see it as cancelled. It cannot be reopened.", confirmLabel: "Cancel tour day", cancelLabel: "Keep it", tone: "danger" })) return;
    runAction(() => cancelTourDay(context.tourDay.id), "Could not cancel the tour day.");
  }

  async function handleForceMajeure() {
    if (!context) return;
    const reason = await prompt({ title: "Cancel by force majeure?", message: "The day is cancelled for reasons beyond anyone's control (weather, strikes, closures…). It cannot be reopened.", label: "Reason (shown in the history)", placeholder: "e.g. Typhoon warning in Kyoto", optional: true, multiline: true, confirmLabel: "Cancel by force majeure", cancelLabel: "Keep it", tone: "danger" });
    if (reason === null) return;
    runAction(() => forceMajeureTourDay(context.tourDay.id, reason), "Could not cancel the tour day by force majeure.");
  }

  async function handleComplete() {
    if (!context || !await confirm({ title: "Mark this tour day as completed?", message: "Use it when the tour took place; the day is closed.", confirmLabel: "Mark completed" })) return;
    runAction(() => completeTourDay(context.tourDay.id), "Could not complete the tour day.");
  }

  async function handleReject() {
    const question = admin
      ? { title: "Reject for the guide?", message: "The preassignment is rejected on behalf of the guide and the day goes back to pending assignment.", confirmLabel: "Reject preassignment" }
      : { title: "Decline this tour?", message: "It will be offered to other guides.", confirmLabel: "Decline tour" };
    if (!context || !await confirm({ ...question, cancelLabel: "Keep it", tone: "danger" })) return;
    runAction(() => rejectTourDay(context.tourDay.id), "Could not reject the tour day.");
  }

  const tourDay = context?.tourDay;
  const isFinal = tourDay ? finalStatuses.includes(tourDay.status) : false;
  const isCancelled = tourDay?.status === "CANCELLED" || tourDay?.status === "FORCE_MAJEURE_CANCELLED";
  const backLink = !admin ? { href: "/dashboard", label: "My tours" } : context?.reservation ? { href: `/reservations/${encodeURIComponent(context.reservation.code ?? context.reservation.id)}`, label: "Back to reservation" } : { href: "/reservations", label: "Reservations" };

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem={admin ? "Reservations" : "Dashboard"} />

        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb={admin ? "Workspace / Reservations / Tour day" : "Workspace / My tours / Tour day"} />

          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="pb-6 pt-8 sm:pt-10">
                <Link href={backLink.href} className="inline-flex bg-[#e9e5d7] px-3 py-2 text-[9px] text-[#5d5e55] transition-colors hover:bg-[#ded8c7]">← {backLink.label}</Link>
                {error && <p role="alert" className="mt-6 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-[10px] text-[#9b6f37]">{error}<button type="button" onClick={() => setError("")} className="ml-3 underline">Dismiss</button></p>}
                {context && <MissingDataNotice missing={context.missing} className="mt-6" />}
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
                      {tourDay.status === "GUIDE_PREASSIGNED" && <button type="button" disabled={isSaving} onClick={() => runAction(() => confirmTourDay(tourDay.id), "Could not confirm the tour day.")} className="h-8 bg-[#292b26] px-3 text-white hover:bg-[#41443b] disabled:opacity-60">{admin ? "Confirm guide" : "Accept tour"}</button>}
                      {tourDay.status === "GUIDE_PREASSIGNED" && <button type="button" disabled={isSaving} onClick={handleReject} className="h-8 border border-[#deddd6] px-3 hover:bg-[#f8f7f3] disabled:opacity-60">{admin ? "Reject for guide" : "Decline"}</button>}
                      {admin && tourDay.status === "CONFIRMED" && <button type="button" disabled={isSaving} onClick={handleComplete} className="h-8 border border-[#deddd6] px-3 hover:bg-[#f8f7f3] disabled:opacity-60">Mark completed</button>}
                      {admin && !isFinal && <button type="button" disabled={isSaving} onClick={handleForceMajeure} className="h-8 border border-[#deddd6] px-3 text-[#9b6f37] hover:bg-[#fbf6ef] disabled:opacity-60">Force majeure</button>}
                      {admin && !isFinal && <button type="button" disabled={isSaving} onClick={handleCancelTourDay} className="h-8 border border-[#deddd6] px-3 text-[#9b6f37] hover:bg-[#fbf6ef] disabled:opacity-60">Cancel tour day</button>}
                    </div>
                  </div>
                )}
              </header>

              {context && tourDay && (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
                  <div className="space-y-5">
                    <TourOverview context={context} onZoneCreated={(zone) => setContext((current) => current && { ...current, zones: [...current.zones, zone] })} canEdit={admin && !isFinal} isEditing={isEditing} draft={draft} isSaving={isSaving} onEdit={() => setIsEditing(true)} onChange={setDraft} onSave={handleSave} onCancel={() => { setIsEditing(false); setDraft(toTourDayDraft(tourDay)); }} />
                    <ItineraryPanel tourDay={tourDay} places={context.places} activities={context.activities} onPlaceCreated={(place) => setContext((current) => current && { ...current, places: [...current.places, place] })} onActivityCreated={(activity) => setContext((current) => current && { ...current, activities: [...current.activities, activity] })} readOnly={!admin || isCancelled} />
                    <TourDayIncidents tourDayId={tourDay.id} canReport={!isCancelled} />
                  </div>
                  <div className="space-y-5">
                    {admin ? <AssignmentPanel tourDay={tourDay} guides={context.guides} disabled={isSaving || isFinal} onAssign={(guideId) => runAction(() => assignGuide([tourDay.id], guideId), "Could not assign the guide.")} onUnassign={(guideId) => runAction(() => unassignGuide([tourDay.id], guideId), "Could not unassign the guide.")} /> : <GuideAssignmentNote tourDay={tourDay} />}
                    <TourResources tourDay={tourDay} />
                    <HistoryTimeline load={loadHistory} version={historyVersion} />
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

function TourOverview({ context, onZoneCreated, canEdit, isEditing, draft, isSaving, onEdit, onChange, onSave, onCancel }: { context: TourDayContext; onZoneCreated: (zone: Zone) => void; canEdit: boolean; isEditing: boolean; draft: TourDayDraft; isSaving: boolean; onEdit: () => void; onChange: (draft: TourDayDraft) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const { tourDay, reservation, zones } = context;
  const zone = zones.find((item) => item.id === tourDay.zone_id);
  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ecebe5] pb-5">
        <div><h2 className="font-serif text-xl">Tour overview</h2><p className="mt-2 text-[10px] text-[#85867c]">The operational details for this experience.</p></div>
        {canEdit && !isEditing && <button type="button" onClick={onEdit} className="h-9 border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]">Edit</button>}
      </div>
      {isEditing ? <TourDayForm draft={draft} zones={zones} onChange={onChange} onZoneCreated={onZoneCreated} onSubmit={onSave} onCancel={onCancel} isSaving={isSaving} submitLabel="Save changes" /> : (
        <div className="grid gap-x-8 gap-y-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Date" value={formatWeekdayDate(tourDay.start_datetime)} />
          <Info label="Time" value={`${formatTime(tourDay.start_datetime)}${tourDay.duration ? ` · ${formatDuration(tourDay.duration)}` : ""}`} />
          <Info label="Guests" value={tourDay.people_count ? `${tourDay.people_count} travellers` : "Not provided"} />
          <Info label="Zone" value={zone?.name ?? "Unassigned"} />
          <Info label={reservation ? "Reservation" : "Code"} value={reservation ? <Link href={`/reservations/${encodeURIComponent(reservation.code ?? reservation.id)}`} className="hover:underline">{reservation.code ?? reservation.id}</Link> : tourDay.code ?? "—"} />
          <Info label="Meeting point" value={tourDay.meeting_point || "Not provided"} />
        </div>
      )}
    </section>
  );
}

// The backend rules (tourdaysapp): a guide can be (re)assigned before their
// confirmation and changed on paid days, which keep their status; unassigning
// is possible until the day is paid.
function isPaid(status: string) { return paidStatuses.includes(status); }
function canChangeGuide(status: string) { return status === "GUIDE_PREASSIGNED" || isPaid(status); }
function canUnassign(status: string) { return ["GUIDE_PREASSIGNED", "GUIDE_CONFIRMED", "PAYMENT_PENDING"].includes(status); }

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
          {canChangeGuide(tourDay.status) && (
            <>
              <label className="mt-5 block text-[9px]">Change guide<Combobox value={selectedGuideId} onChange={setSelectedGuideId} options={guides.filter((item) => item.guide.id !== tourDay.guide_id).map(guideOption)} noun="guide" placeholder="Search another guide..." disabled={disabled} inputClass="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]" /></label>
              {isPaid(tourDay.status) && <p className="mt-2 text-[8px] text-[#85867c]">The day is already paid: it keeps its status with the new guide.</p>}
              <button type="button" disabled={disabled || !selectedGuideId} onClick={() => { onAssign(selectedGuideId); setSelectedGuideId(""); }} className="mt-3 h-9 w-full bg-[#292b26] text-[9px] text-white hover:bg-[#41443b] disabled:opacity-50">Change guide</button>
            </>
          )}
          {canUnassign(tourDay.status) && <button type="button" disabled={disabled} onClick={() => tourDay.guide_id && onUnassign(tourDay.guide_id)} className="mt-3 h-9 w-full border border-[#deddd6] text-[9px] hover:bg-[#f8f7f3] disabled:opacity-50">Unassign guide</button>}
        </>
      ) : (
        <>
          <p className="mt-4 text-[10px] text-[#85867c]">{isPaid(tourDay.status) ? "No guide: the day is paid and needs one (it keeps its status)." : "No guide assigned yet."}</p>
          <label className="mt-4 block text-[9px]">Guide<Combobox value={selectedGuideId} onChange={setSelectedGuideId} options={guides.map(guideOption)} noun="guide" placeholder="Search a guide..." disabled={disabled} inputClass="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]" /></label>
          <button type="button" disabled={disabled || !selectedGuideId} onClick={() => onAssign(selectedGuideId)} className="mt-3 h-9 w-full bg-[#292b26] text-[9px] text-white hover:bg-[#41443b] disabled:opacity-50">Assign guide</button>
        </>
      )}
    </section>
  );
}

function GuideAssignmentNote({ tourDay }: { tourDay: TourDay }) {
  const note = tourDay.status === "GUIDE_PREASSIGNED"
    ? "You have been preassigned to this tour. Accept or decline it; without an answer within 24 hours it counts as accepted."
    : finalStatuses.includes(tourDay.status)
      ? "This tour is closed."
      : "You are the guide for this tour. Report anything unusual as an incident.";
  return (
    <section className="bg-[#e9e5d7] p-5 sm:p-6">
      <p className="text-[8px] font-semibold tracking-[0.2em] text-[#9b8353]">YOUR ASSIGNMENT</p>
      <p className="mt-3 font-serif text-xl">{formatStatus(tourDay.status)}</p>
      <p className="mt-3 text-[10px] leading-relaxed text-[#5d5e55]">{note}</p>
    </section>
  );
}

function ItineraryPanel({ tourDay, places, activities, onPlaceCreated, onActivityCreated, readOnly }: { tourDay: TourDay; places: ItineraryPlace[]; activities: ItineraryActivity[]; onPlaceCreated: (place: ItineraryPlace) => void; onActivityCreated: (activity: ItineraryActivity) => void; readOnly: boolean }) {
  const [stopCount, setStopCount] = useState(0);
  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-xl">Day itinerary</h2><p className="mt-2 text-[10px] text-[#85867c]">A considered route, arranged from morning to afternoon.</p></div><span className="text-[9px] text-[#9b8353]">{stopCount} STOPS</span></div>
      <ItineraryEditor tourDay={tourDay} places={places} activities={activities} onCountChange={setStopCount} onPlaceCreated={onPlaceCreated} onActivityCreated={onActivityCreated} readOnly={readOnly} />
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

function guideOption(item: GuideDetail) {
  return { id: item.guide.id, label: item.guide.name, detail: item.zones.map((zone) => zone.name).join(", ") || null };
}
