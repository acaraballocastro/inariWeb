"use client";

import type { FormEvent } from "react";
import type { Zone } from "@/features/catalogs/api";
import type { TourDay, TourDayFormInput } from "@/features/tours/api";
import { formatDuration, isoToJstInput, jstInputToIso, parseDuration } from "@/lib/datetime";

export type TourDayDraft = {
  title: string;
  start_datetime: string;
  duration: string;
  zone_id: string;
  people_count: string;
  meeting_point: string;
  remuneration: string;
  guide_liability_notes: string;
  customer_liability_notes: string;
};

export const emptyTourDayDraft: TourDayDraft = { title: "", start_datetime: "", duration: "", zone_id: "", people_count: "", meeting_point: "", remuneration: "", guide_liability_notes: "", customer_liability_notes: "" };

export function toTourDayDraft(tourDay: TourDay): TourDayDraft {
  return {
    title: tourDay.title ?? "",
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

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]";
const textareaClass = "mt-2 min-h-20 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 py-2 text-[10px] outline-none focus:border-[#b5a786]";

export function TourDayForm({ draft, zones, onChange, onSubmit, onCancel, isSaving, submitLabel }: { draft: TourDayDraft; zones: Zone[]; onChange: (draft: TourDayDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; isSaving: boolean; submitLabel: string }) {
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-[9px] sm:col-span-2">Title *<input required value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="e.g. Kyoto's eastern lanes" className={inputClass} /></label>
      <label className="text-[9px]">Start date and time (JST) *<input required type="datetime-local" value={draft.start_datetime} onChange={(event) => onChange({ ...draft, start_datetime: event.target.value })} className={inputClass} /></label>
      <label className="text-[9px]">Duration<input value={draft.duration} onChange={(event) => onChange({ ...draft, duration: event.target.value })} placeholder="e.g. 6h" className={inputClass} /></label>
      <label className="text-[9px]">Zone<select value={draft.zone_id} onChange={(event) => onChange({ ...draft, zone_id: event.target.value })} className={inputClass}><option value="">No zone assigned</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <label className="text-[9px]">Guests<input type="number" min="1" step="1" value={draft.people_count} onChange={(event) => onChange({ ...draft, people_count: event.target.value })} className={inputClass} /></label>
      <label className="text-[9px]">Meeting point<input value={draft.meeting_point} onChange={(event) => onChange({ ...draft, meeting_point: event.target.value })} className={inputClass} /></label>
      <label className="text-[9px]">Remuneration<input type="number" min="0" step="any" value={draft.remuneration} onChange={(event) => onChange({ ...draft, remuneration: event.target.value })} className={inputClass} /></label>
      <label className="text-[9px] sm:col-span-2">Guide notes<textarea value={draft.guide_liability_notes} onChange={(event) => onChange({ ...draft, guide_liability_notes: event.target.value })} className={textareaClass} /></label>
      <label className="text-[9px] sm:col-span-2">Customer notes<textarea value={draft.customer_liability_notes} onChange={(event) => onChange({ ...draft, customer_liability_notes: event.target.value })} className={textareaClass} /></label>
      <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-4 text-[9px] text-white hover:bg-[#41443b] disabled:opacity-60">{isSaving ? "Saving..." : submitLabel}</button><button type="button" onClick={onCancel} disabled={isSaving} className="h-9 border border-[#deddd6] px-4 text-[9px] hover:bg-[#f8f7f3] disabled:opacity-50">Cancel</button></div>
    </form>
  );
}

export function toDateTimeInput(value: string) {
  return isoToJstInput(value);
}
