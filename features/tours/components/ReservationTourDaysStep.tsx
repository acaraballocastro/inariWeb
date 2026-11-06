"use client";

import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { withFallback } from "@/lib/missing";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { listZones, type Zone } from "@/features/catalogs/api";
import type { Reservation } from "@/features/reservations/api";
import { createTourDay, listTourDaysByReservation, updateTourDay, type TourDay } from "@/features/tours/api";
import { formatDuration, formatJst } from "@/lib/datetime";
import { TourDayForm, emptyTourDayDraft, toDateTimeInput, toTourDayDraft, toTourDayInput, type TourDayDraft } from "@/features/tours/components/TourDayForm";

// Second step of the reservation creation: the API generates one tour day per date,
// here they are completed and extra days can be added before finishing.
export function ReservationTourDaysStep({ reservation, onFinish }: { reservation: Reservation; onFinish: () => void }) {
  const [tourDays, setTourDays] = useState<TourDay[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TourDayDraft>(emptyTourDayDraft);
  const { missing, report } = useMissingData();

  const loadTourDays = useCallback(async () => {
    const items = await listTourDaysByReservation(reservation.id);
    setTourDays(items.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()));
  }, [reservation.id]);

  useEffect(() => {
    let active = true;
    const failed: string[] = [];
    Promise.all([listTourDaysByReservation(reservation.id), withFallback(listZones(), [], "zones", failed)])
      .then(([items, zoneItems]) => { if (active) { failed.forEach(report); setTourDays(items.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())); setZones(zoneItems ?? []); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the tour days."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [reservation.id, report]);

  function startEditing(tourDay: TourDay) {
    setError(""); setEditingId(tourDay.id); setDraft(toTourDayDraft(tourDay));
  }

  function startCreating() {
    const lastDay = tourDays.at(-1);
    const nextDate = lastDay ? new Date(new Date(lastDay.start_datetime).getTime() + 86400000).toISOString() : reservation.start_date;
    setError(""); setEditingId("new");
    setDraft({ ...emptyTourDayDraft, title: reservation.title ?? "", start_datetime: toDateTimeInput(nextDate), people_count: reservation.total_people_count ? String(reservation.total_people_count) : "" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = toTourDayInput(draft);
    if ("error" in result) { setError(result.error); return; }
    const editing = tourDays.find((day) => day.id === editingId);
    setIsSaving(true); setError("");
    try {
      if (editing) await updateTourDay(editing, result.input);
      else await createTourDay(reservation.id, result.input);
      await loadTourDays();
      setEditingId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save the tour day.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="px-6 py-6 sm:px-8">
      {error && <p role="alert" className="mb-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
      <MissingDataNotice missing={missing} className="mb-5" />
      <p className="text-body leading-relaxed text-[#85867c]">One tour day was generated for each date of <span className="text-[#55574f]">{reservation.title || reservation.code || "the reservation"}</span>. Complete their details or add more days.</p>

      {isLoading && <p className="mt-5 text-body text-[#85867c]">Loading tour days...</p>}
      {!isLoading && tourDays.length === 0 && editingId !== "new" && <p className="mt-5 text-body text-[#85867c]">No tour days linked.</p>}

      <div className="mt-5 divide-y divide-[#ecebe5] border-y border-[#ecebe5]">
        {tourDays.map((day) => editingId === day.id ? (
          <div key={day.id} className="pb-5"><TourDayForm draft={draft} zones={zones} reservationCode={reservation.code} onChange={setDraft} onZoneCreated={(zone) => setZones((current) => [...current, zone])} onSubmit={handleSubmit} onCancel={() => setEditingId(null)} isSaving={isSaving} submitLabel="Save tour day" /></div>
        ) : (
          <article key={day.id} className="grid gap-3 py-4 sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-start">
            <p className="text-body text-[#55574f]">{formatDateTime(day.start_datetime)}</p>
            <div className="min-w-0"><p className="text-body font-medium">{day.title || day.code || "Untitled tour day"}</p><p className="mt-2 text-label text-[#85867c]">{formatDuration(day.duration) || "Duration not provided"} · {zones.find((zone) => zone.id === day.zone_id)?.name ?? "No zone"} · {day.people_count ?? 0} guests</p><p className="mt-1 text-label text-[#85867c]">{day.meeting_point || "Meeting point not provided"}</p></div>
            <button type="button" disabled={isSaving || editingId !== null} onClick={() => startEditing(day)} className="h-8 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3] disabled:opacity-50">Edit</button>
          </article>
        ))}
        {editingId === "new" && <div className="pb-5"><TourDayForm draft={draft} zones={zones} reservationCode={reservation.code} onChange={setDraft} onZoneCreated={(zone) => setZones((current) => [...current, zone])} onSubmit={handleSubmit} onCancel={() => setEditingId(null)} isSaving={isSaving} submitLabel="Create tour day" /></div>}
      </div>

      {editingId === null && !isLoading && <button type="button" onClick={startCreating} className="mt-4 h-9 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3]">+ Add tour day</button>}

      <footer className="mt-7 flex flex-col-reverse gap-3 border-t border-[#ecebe5] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-meta text-[#96968b]">{tourDays.length} tour days · You can keep editing them from the reservation.</p>
        <button type="button" onClick={onFinish} disabled={isSaving || editingId !== null} className="h-10 bg-[#292b26] px-6 text-body text-white transition-colors hover:bg-[#41443b] disabled:cursor-not-allowed disabled:opacity-50">Continue to itinerary</button>
      </footer>
    </div>
  );
}

function formatDateTime(value: string) {
  return formatJst(value, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
