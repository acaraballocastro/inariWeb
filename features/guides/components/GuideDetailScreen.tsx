"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createGuideAvailability, deleteGuideAvailability, getGuideDetail, listGuideAvailabilities, listLanguages, listZones, updateGuide, updateGuideAvailability, type GuideAvailability, type GuideDetail, type GuideLanguage, type GuideZone } from "@/features/guides/api";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { RelationSelector } from "@/features/guides/components/RelationSelector";

export function GuideDetailScreen({ guideId }: { guideId: string }) {
  const [detail, setDetail] = useState<GuideDetail | null>(null);
  const [originalDetail, setOriginalDetail] = useState<GuideDetail | null>(null);
  const [languages, setLanguages] = useState<GuideLanguage[]>([]);
  const [zones, setZones] = useState<GuideZone[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [maxTours, setMaxTours] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [availabilities, setAvailabilities] = useState<GuideAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [availabilityDraft, setAvailabilityDraft] = useState({ start_date: "", end_date: "", reason: "" });
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  useEffect(() => {
    Promise.all([getGuideDetail(guideId), listLanguages(), listZones()])
      .then(([result, languageItems, zoneItems]) => {
        setDetail(result);
        setOriginalDetail(result);
        setLanguages(languageItems.filter((language) => language.is_active !== false));
        setZones(zoneItems.filter((zone) => zone.is_active !== false));
        setName(result.guide.name);
        setEmail(result.guide.email);
        setPhone(result.guide.phone);
        setMaxTours(String(result.guide.max_tours_per_day));
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la guía."));
  }, [guideId]);

  useEffect(() => {
    listGuideAvailabilities(guideId)
      .then((items) => setAvailabilities(items ?? []))
      .catch((requestError) => setAvailabilityError(requestError instanceof Error ? requestError.message : "No se pudo cargar la disponibilidad."))
      .finally(() => setAvailabilityLoading(false));
  }, [guideId]);

  function startAvailabilityEdit(availability: GuideAvailability) {
    setEditingAvailabilityId(availability.id);
    setAvailabilityDraft({ start_date: toDateInput(availability.start_date), end_date: toDateInput(availability.end_date), reason: availability.reason ?? "" });
    setShowAvailabilityForm(true);
  }

  async function saveAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!availabilityDraft.start_date || !availabilityDraft.end_date || availabilityDraft.start_date > availabilityDraft.end_date) {
      setAvailabilityError("Selecciona un rango de fechas válido.");
      return;
    }
    setAvailabilitySaving(true);
    setAvailabilityError("");
    try {
      const saved = editingAvailabilityId
        ? await updateGuideAvailability(guideId, editingAvailabilityId, availabilityDraft)
        : await createGuideAvailability(guideId, availabilityDraft);
      setAvailabilities((current) => editingAvailabilityId ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setAvailabilityDraft({ start_date: "", end_date: "", reason: "" });
      setEditingAvailabilityId(null);
      setShowAvailabilityForm(false);
    } catch (requestError) {
      setAvailabilityError(requestError instanceof Error ? requestError.message : "No se pudo guardar la disponibilidad.");
    } finally {
      setAvailabilitySaving(false);
    }
  }

  async function removeAvailability(availability: GuideAvailability) {
    if (!window.confirm("Delete this availability range?")) return;
    try {
      await deleteGuideAvailability(guideId, availability.id);
      setAvailabilities((current) => current.filter((item) => item.id !== availability.id));
    } catch (requestError) {
      setAvailabilityError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la disponibilidad.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !name.trim() || !email.trim() || !maxTours || Number(maxTours) < 1) {
      setError("Completa nombre, email y un límite de tours válido.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await updateGuide(guideId, { name: name.trim(), email: email.trim(), phone: phone.trim(), max_tours_per_day: Number(maxTours), languages: detail.languages, zones: detail.zones });
      setDetail({ ...detail, guide: { ...detail.guide, name: name.trim(), email: email.trim(), phone: phone.trim(), max_tours_per_day: Number(maxTours) } });
      setOriginalDetail({ ...detail, guide: { ...detail.guide, name: name.trim(), email: email.trim(), phone: phone.trim(), max_tours_per_day: Number(maxTours) } });
      setIsEditing(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar la guía.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Guides" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Guides / Detail" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[900px]">
              <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
                <Link href="/guides" className="text-[9px] text-[#9b8353]">Back to guides</Link>
                <p className="mt-6 text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">GUIDE PROFILE</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">{detail?.guide.name ?? "Guide detail"}</h1>
              </header>
              {error && <p role="alert" className="mt-5 text-[10px] text-[#9b6f37]">{error}</p>}
              {detail && <section className="mt-5 bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 border-b border-[#ecebe5] pb-5">
                  <div><h2 className="font-serif text-xl">Guide profile</h2><p className="mt-2 text-[9px] text-[#96968b]">Profile details and daily assignment capacity</p></div>
                  {!isEditing && <button type="button" onClick={() => setIsEditing(true)} className="h-9 border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]">Edit</button>}
                </div>
                {isEditing ? <form onSubmit={handleSubmit} className="mt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-[9px]">Name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-[9px]">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-[9px]">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-[9px]">Max tours per day<input type="number" min="1" value={maxTours} onChange={(event) => setMaxTours(event.target.value)} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]" /></label>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2"><RelationSelector label="Languages" options={languages} selected={detail.languages} onChange={(selected) => setDetail({ ...detail, languages: selected })} /><RelationSelector label="Zones" options={zones} selected={detail.zones} onChange={(selected) => setDetail({ ...detail, zones: selected })} /></div>
                  <div className="mt-5 flex gap-2"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-4 text-[9px] font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save changes"}</button><button type="button" onClick={() => { if (originalDetail) { setDetail(originalDetail); setName(originalDetail.guide.name); setEmail(originalDetail.guide.email); setPhone(originalDetail.guide.phone); setMaxTours(String(originalDetail.guide.max_tours_per_day)); } setError(""); setIsEditing(false); }} className="h-9 border border-[#deddd6] px-4 text-[9px] hover:bg-[#f8f7f3]">Cancel</button></div>
                </form> : <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="text-[9px] text-[#96968b]">Email</p><p className="mt-2 text-[11px]">{detail.guide.email}</p></div><div><p className="text-[9px] text-[#96968b]">Phone</p><p className="mt-2 text-[11px]">{detail.guide.phone || "Not provided"}</p></div><div><p className="text-[9px] text-[#96968b]">Languages</p><p className="mt-2 text-[11px]">{detail.languages.map((language) => language.name).join(" · ") || "Not specified"}</p></div><div><p className="text-[9px] text-[#96968b]">Zones</p><p className="mt-2 text-[11px]">{detail.zones.map((zone) => zone.name).join(" · ") || "Not assigned"}</p></div><div><p className="text-[9px] text-[#96968b]">Max tours per day</p><p className="mt-2 text-[11px]">{detail.guide.max_tours_per_day}</p></div></div>}
              </section>}
              <AvailabilitySection availabilities={availabilities} isLoading={availabilityLoading} error={availabilityError} showForm={showAvailabilityForm} draft={availabilityDraft} isSaving={availabilitySaving} editingId={editingAvailabilityId} onAdd={() => { setEditingAvailabilityId(null); setAvailabilityDraft({ start_date: "", end_date: "", reason: "" }); setShowAvailabilityForm(true); }} onEdit={startAvailabilityEdit} onDelete={removeAvailability} onChange={setAvailabilityDraft} onSubmit={saveAvailability} onCancel={() => { setShowAvailabilityForm(false); setEditingAvailabilityId(null); }} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function AvailabilitySection({ availabilities, isLoading, error, showForm, draft, isSaving, editingId, onAdd, onEdit, onDelete, onChange, onSubmit, onCancel }: { availabilities: GuideAvailability[]; isLoading: boolean; error: string; showForm: boolean; draft: { start_date: string; end_date: string; reason: string }; isSaving: boolean; editingId: string | null; onAdd: () => void; onEdit: (availability: GuideAvailability) => void; onDelete: (availability: GuideAvailability) => void; onChange: (draft: { start_date: string; end_date: string; reason: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <section className="mt-5 bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4 border-b border-[#ecebe5] pb-5"><div><h2 className="font-serif text-xl">Availability</h2><p className="mt-2 text-[9px] text-[#96968b]">Dates when this guide is unavailable for assignments</p></div><button type="button" onClick={onAdd} className="h-9 bg-[#292b26] px-3 text-[9px] font-medium text-white hover:bg-[#3a3d34]">+ Add dates</button></div>{showForm && <form onSubmit={onSubmit} className="mt-5 grid gap-3 border-b border-[#ecebe5] pb-5 sm:grid-cols-[1fr_1fr_1.4fr_auto]"><label className="text-[9px] text-[#77786f]">Start date<input type="date" value={draft.start_date} onChange={(event) => onChange({ ...draft, start_date: event.target.value })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-[10px] outline-none focus:border-[#b5a786]" /></label><label className="text-[9px] text-[#77786f]">End date<input type="date" value={draft.end_date} onChange={(event) => onChange({ ...draft, end_date: event.target.value })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-[10px] outline-none focus:border-[#b5a786]" /></label><label className="text-[9px] text-[#77786f]">Reason<input value={draft.reason} onChange={(event) => onChange({ ...draft, reason: event.target.value })} placeholder="Holiday or personal leave" className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-[10px] outline-none focus:border-[#b5a786]" /></label><span className="flex items-end gap-1.5"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-3 text-[9px] font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : editingId ? "Save" : "Add"}</button><button type="button" onClick={onCancel} className="h-9 border border-[#deddd6] bg-white px-3 text-[9px] text-[#77786f]">Cancel</button></span></form>}{error && <p role="alert" className="mt-4 text-[10px] text-[#9b6f37]">{error}</p>}{isLoading && <p className="mt-5 text-[10px] text-[#85867c]">Loading availability...</p>}{!isLoading && !error && availabilities.length === 0 && <p className="mt-5 text-[10px] text-[#85867c]">No blocked dates.</p>}{!isLoading && availabilities.length > 0 && <div className="mt-5 divide-y divide-[#f0efe9]">{availabilities.map((availability) => <div key={availability.id} className="grid items-center gap-3 py-4 text-[9px] sm:grid-cols-[150px_150px_1fr_auto]"><div><p className="text-[8px] text-[#96968b]">START</p><p className="mt-1">{toDateInput(availability.start_date)}</p></div><div><p className="text-[8px] text-[#96968b]">END</p><p className="mt-1">{toDateInput(availability.end_date)}</p></div><p className="text-[#77786f]">{availability.reason || "No reason provided"}</p><span className="flex gap-2 text-[8px]"><button type="button" onClick={() => { onEdit(availability); }} className="underline underline-offset-2">Edit</button><button type="button" onClick={() => onDelete(availability)} className="text-[#9b6f37] underline underline-offset-2">Delete</button></span></div>)}</div>}</section>;
}
