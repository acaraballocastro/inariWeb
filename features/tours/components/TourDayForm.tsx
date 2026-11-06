"use client";

import { DateTimeInput } from "@/features/dashboard/components/DateTimeInput";
import { useEffect, useState, type FormEvent } from "react";
import { createZone, listHotels, listLanguages, type Hotel, type Language, type Zone } from "@/features/catalogs/api";
import { getReservationDetail, type ReservationCustomer } from "@/features/reservations/api";
import { Combobox } from "@/features/dashboard/components/Combobox";
import type { TourDay, TourDayFormInput } from "@/features/tours/api";
import { formatDuration, isoToJstInput, jstInputToIso, parseDuration } from "@/lib/datetime";

export type TourDayDraft = {
  title: string;
  description: string;
  required_language_ids: string[];
  customer_ids: string[];
  guide_hotel_id: string;
  customer_hotel_id: string;
  start_datetime: string;
  duration: string;
  zone_id: string;
  people_count: string;
  meeting_point: string;
  remuneration: string;
  guide_liability_notes: string;
  customer_liability_notes: string;
};

export const emptyTourDayDraft: TourDayDraft = { title: "", description: "", required_language_ids: [], customer_ids: [], guide_hotel_id: "", customer_hotel_id: "", start_datetime: "", duration: "", zone_id: "", people_count: "", meeting_point: "", remuneration: "", guide_liability_notes: "", customer_liability_notes: "" };

export function toTourDayDraft(tourDay: TourDay): TourDayDraft {
  return {
    title: tourDay.title ?? "",
    description: tourDay.description ?? "",
    required_language_ids: tourDay.required_language_ids ?? [],
    customer_ids: tourDay.customer_ids ?? [],
    guide_hotel_id: tourDay.guide_hotel_id ?? "",
    customer_hotel_id: tourDay.customer_hotel_id ?? "",
    start_datetime: toDateTimeInput(tourDay.start_datetime),
    duration: formatDuration(tourDay.duration),
    zone_id: tourDay.zone_id ?? "",
    people_count: tourDay.people_count == null ? "" : String(tourDay.people_count),
    meeting_point: tourDay.meeting_point ?? "",
    remuneration: tourDay.remuneration == null ? "" : String(tourDay.remuneration),
    guide_liability_notes: tourDay.guide_liability_notes ?? "",
    customer_liability_notes: tourDay.customer_liability_notes ?? "",
  };
}

export function toTourDayInput(draft: TourDayDraft): { input: TourDayFormInput } | { error: string } {
  if (!draft.title.trim()) return { error: "Enter a tour day title." };
  if (!draft.start_datetime) return { error: "Select the start date and time." };
  const peopleCount = draft.people_count ? Number(draft.people_count) : null;
  if (peopleCount !== null && (!Number.isInteger(peopleCount) || peopleCount < 1)) return { error: "The number of guests must be at least 1." };
  const duration = parseDuration(draft.duration);
  if (Number.isNaN(duration)) return { error: "Enter the duration as a whole number of hours, e.g. 6h." };
  const remuneration = draft.remuneration ? Number(draft.remuneration) : null;
  if (remuneration !== null && (Number.isNaN(remuneration) || remuneration < 0)) return { error: "Remuneration must be a positive amount." };

  return {
    input: {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      required_language_ids: draft.required_language_ids,
      customer_ids: draft.customer_ids,
      guide_hotel_id: draft.guide_hotel_id,
      customer_hotel_id: draft.customer_hotel_id,
      start_datetime: jstInputToIso(draft.start_datetime),
      duration,
      zone_id: draft.zone_id || null,
      people_count: peopleCount,
      meeting_point: draft.meeting_point.trim() || null,
      remuneration,
      guide_liability_notes: draft.guide_liability_notes.trim() || null,
      customer_liability_notes: draft.customer_liability_notes.trim() || null,
    },
  };
}

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";
const textareaClass = "mt-2 min-h-20 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 py-2 text-body outline-none focus:border-[#b5a786]";

/** `onZoneCreated` lets the screen add a zone created here to its own list. */
/** `reservationCode` loads the reservation's customers to choose the day's. */
export function TourDayForm({ draft, zones, reservationCode, onChange, onZoneCreated, onSubmit, onCancel, isSaving, submitLabel }: { draft: TourDayDraft; zones: Zone[]; reservationCode?: string | null; onChange: (draft: TourDayDraft) => void; onZoneCreated?: (zone: Zone) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; isSaving: boolean; submitLabel: string }) {
  const zoneOptions = zones.filter((zone) => zone.is_active || zone.id === draft.zone_id).map((zone) => ({ id: zone.id, label: zone.name }));
  async function addZone(name: string) {
    const zone = await createZone({ name });
    onZoneCreated?.(zone);
    return { id: zone.id, label: zone.name };
  }
  const languages = useLanguages();
  const hotels = useHotels();
  const hotelOptions = hotels.filter((hotel) => hotel.is_active || hotel.id === draft.guide_hotel_id || hotel.id === draft.customer_hotel_id);
  const customers = useReservationCustomers(reservationCode);
  function toggleCustomer(id: string) {
    const selected = draft.customer_ids;
    onChange({ ...draft, customer_ids: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] });
  }
  const languageOptions = languages.filter((language) => language.is_active || draft.required_language_ids.includes(language.id));
  function toggleLanguage(id: string) {
    const selected = draft.required_language_ids;
    onChange({ ...draft, required_language_ids: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] });
  }
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-meta sm:col-span-2">Title *<input required value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="e.g. Kyoto's eastern lanes" className={inputClass} /></label>
      <label className="text-meta sm:col-span-2">Description<textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} placeholder="What the day is about" className={textareaClass} /></label>
      <fieldset className="text-meta sm:col-span-2">
        <legend>Required languages</legend>
        {languageOptions.length === 0 ? <p className="mt-2 text-label text-[#96968b]">No languages in the catalog.</p> : (
          <div className="mt-2 flex flex-wrap gap-2">
            {languageOptions.map((language) => {
              const selected = draft.required_language_ids.includes(language.id);
              return <button key={language.id} type="button" aria-pressed={selected} disabled={isSaving} onClick={() => toggleLanguage(language.id)} className={`h-11 border px-4 text-body disabled:opacity-50 sm:h-8 sm:px-3 sm:text-meta ${selected ? "border-[#292b26] bg-[#292b26] text-white" : "border-[#deddd6] hover:bg-[#f8f7f3]"}`}>{language.name}</button>;
            })}
          </div>
        )}
      </fieldset>
      <label className="text-meta">Start date and time (JST) *<DateTimeInput value={draft.start_datetime} onChange={(start_datetime) => onChange({ ...draft, start_datetime })} disabled={isSaving} className={inputClass} ariaLabel="Start" /></label>
      <label className="text-meta">Duration<input value={draft.duration} onChange={(event) => onChange({ ...draft, duration: event.target.value })} placeholder="e.g. 6h" className={inputClass} /></label>
      <label className="text-meta">Zone<Combobox value={draft.zone_id} options={zoneOptions} onChange={(zoneId) => onChange({ ...draft, zone_id: zoneId })} onCreate={addZone} noun="zone" placeholder="Search or create a zone..." emptyLabel="No zone assigned" disabled={isSaving} inputClass={inputClass} /></label>
      <label className="text-meta">Guests<input type="number" min="1" step="1" value={draft.people_count} onChange={(event) => onChange({ ...draft, people_count: event.target.value })} className={inputClass} /></label>
      <label className="text-meta">Meeting point<input value={draft.meeting_point} onChange={(event) => onChange({ ...draft, meeting_point: event.target.value })} className={inputClass} /></label>
      <label className="text-meta">Guide hotel<select value={draft.guide_hotel_id} onChange={(event) => onChange({ ...draft, guide_hotel_id: event.target.value })} disabled={isSaving} className={inputClass}><option value="">No hotel</option>{hotelOptions.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select></label>
      <label className="text-meta">Customers&apos; hotel<select value={draft.customer_hotel_id} onChange={(event) => onChange({ ...draft, customer_hotel_id: event.target.value })} disabled={isSaving} className={inputClass}><option value="">No hotel</option>{hotelOptions.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select></label>
      {customers.length > 0 && (
        <fieldset className="text-meta sm:col-span-2">
          <legend>Customers on this day</legend>
          <p className="mt-1 text-label text-[#96968b]">{draft.customer_ids.length === 0 ? "All the reservation's customers." : `${draft.customer_ids.length} of ${customers.length} customers.`}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {customers.map((customer) => {
              const selected = draft.customer_ids.includes(customer.id);
              return <button key={customer.id} type="button" aria-pressed={selected} disabled={isSaving} onClick={() => toggleCustomer(customer.id)} className={`h-11 border px-4 text-body disabled:opacity-50 sm:h-8 sm:px-3 sm:text-meta ${selected ? "border-[#292b26] bg-[#292b26] text-white" : "border-[#deddd6] hover:bg-[#f8f7f3]"}`}>{customer.full_name}</button>;
            })}
          </div>
        </fieldset>
      )}
      <label className="text-meta">Remuneration<input type="number" min="0" step="any" value={draft.remuneration} onChange={(event) => onChange({ ...draft, remuneration: event.target.value })} className={inputClass} /></label>
      <label className="text-meta sm:col-span-2">Guide notes<textarea value={draft.guide_liability_notes} onChange={(event) => onChange({ ...draft, guide_liability_notes: event.target.value })} className={textareaClass} /></label>
      <label className="text-meta sm:col-span-2">Customer notes<textarea value={draft.customer_liability_notes} onChange={(event) => onChange({ ...draft, customer_liability_notes: event.target.value })} className={textareaClass} /></label>
      <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-4 text-meta text-white hover:bg-[#41443b] disabled:opacity-60">{isSaving ? "Saving..." : submitLabel}</button><button type="button" onClick={onCancel} disabled={isSaving} className="h-9 border border-[#deddd6] px-4 text-meta hover:bg-[#f8f7f3] disabled:opacity-50">Cancel</button></div>
    </form>
  );
}

/** The language catalog, loaded once per form; empty while loading or when it fails. */
export function useLanguages() {
  const [languages, setLanguages] = useState<Language[]>([]);
  useEffect(() => {
    let active = true;
    listLanguages().then((items) => { if (active) setLanguages(items ?? []); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return languages;
}

/** The hotels catalog, loaded once per form. */
export function useHotels() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  useEffect(() => {
    let active = true;
    listHotels().then((items) => { if (active) setHotels(items); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return hotels;
}

function useReservationCustomers(code: string | null | undefined) {
  const [customers, setCustomers] = useState<ReservationCustomer[]>([]);
  useEffect(() => {
    if (!code) return;
    let active = true;
    getReservationDetail(code).then((detail) => { if (active) setCustomers(detail.customers); }).catch(() => {});
    return () => { active = false; };
  }, [code]);
  return code ? customers : [];
}

export function toDateTimeInput(value: string) {
  return isoToJstInput(value);
}
