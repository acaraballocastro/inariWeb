"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { DateInput } from "@/features/dashboard/components/DateInput";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createGuideAvailability, deleteGuideAvailability, getGuideDetail, listGuideAvailabilities, updateGuide, updateGuideAvailability, type GuideAvailability, type GuideDetail, type GuideLanguage, type GuideZone } from "@/features/guides/api";
import { createZone, listLanguages, listZones } from "@/features/catalogs/api";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { RelationSelector } from "@/features/guides/components/RelationSelector";

/** `self`: the signed-in guide's own profile, read-only except for the availability. */
export function GuideDetailScreen({ guideId, self = false }: { guideId: string; self?: boolean }) {
  const { confirm } = useDialogs();
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
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load the guide."));
  }, [guideId]);

  useEffect(() => {
    listGuideAvailabilities(guideId)
      .then((items) => setAvailabilities(items ?? []))
      .catch((requestError) => setAvailabilityError(requestError instanceof Error ? requestError.message : "Could not load the availability."))
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
      setAvailabilityError("Select a valid date range.");
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
      setAvailabilityError(requestError instanceof Error ? requestError.message : "Could not save the availability.");
    } finally {
      setAvailabilitySaving(false);
    }
  }

  async function removeAvailability(availability: GuideAvailability) {
    if (!await confirm({ title: "Delete these blocked dates?", message: "The guide becomes available again on those days.", confirmLabel: "Delete", tone: "danger" })) return;
    try {
      await deleteGuideAvailability(guideId, availability.id);
      setAvailabilities((current) => current.filter((item) => item.id !== availability.id));
    } catch (requestError) {
      setAvailabilityError(requestError instanceof Error ? requestError.message : "Could not delete the availability.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !name.trim() || !email.trim() || !maxTours || Number(maxTours) < 1) {
      setError("Enter a name, an email and a valid tour limit.");
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
      setError(requestError instanceof Error ? requestError.message : "Could not update the guide.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem={self ? "Availability" : "Guides"} />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb={self ? "Workspace / Availability" : "Workspace / Guides / Detail"} />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[900px]">
              <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
                {!self && <Link href="/guides" className="mb-6 inline-block text-meta text-[#9b8353]">Back to guides</Link>}
                <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">{self ? "MY PROFILE" : "GUIDE PROFILE"}</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">{self ? "Availability" : detail?.guide.name ?? "Guide detail"}</h1>
                {self && <p className="mt-2 text-lead text-[#85867c]">Block the dates you can&apos;t work. Operations won&apos;t assign you tours on them.</p>}
              </header>
              {error && <p role="alert" className="mt-5 text-body text-[#9b6f37]">{error}</p>}
              {detail && <section className="mt-5 bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 border-b border-[#ecebe5] pb-5">
                  <div><h2 className="font-serif text-xl">Guide profile</h2><p className="mt-2 text-meta text-[#96968b]">Profile details and daily assignment capacity</p></div>
                  {!self && !isEditing && <button type="button" onClick={() => setIsEditing(true)} className="h-9 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3]">Edit</button>}
                </div>
                {isEditing ? <form onSubmit={handleSubmit} className="mt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-meta">Name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-meta">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-meta">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-meta">Max tours per day<input type="number" min="1" value={maxTours} onChange={(event) => setMaxTours(event.target.value)} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2"><RelationSelector label="Languages" options={languages} selected={detail.languages} onChange={(selected) => setDetail({ ...detail, languages: selected })} /><RelationSelector label="Zones" options={zones} selected={detail.zones} onChange={(selected) => setDetail({ ...detail, zones: selected })} onCreate={async (name) => { const zone = await createZone({ name }); setZones((current) => [...current, zone]); return zone; }} /></div>
                  <div className="mt-5 flex gap-2"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-4 text-meta font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save changes"}</button><button type="button" onClick={() => { if (originalDetail) { setDetail(originalDetail); setName(originalDetail.guide.name); setEmail(originalDetail.guide.email); setPhone(originalDetail.guide.phone); setMaxTours(String(originalDetail.guide.max_tours_per_day)); } setError(""); setIsEditing(false); }} className="h-9 border border-[#deddd6] px-4 text-meta hover:bg-[#f8f7f3]">Cancel</button></div>
                </form> : <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="text-meta text-[#96968b]">Email</p><p className="mt-2 text-lead">{detail.guide.email}</p></div><div><p className="text-meta text-[#96968b]">Phone</p><p className="mt-2 text-lead">{detail.guide.phone || "Not provided"}</p></div><div><p className="text-meta text-[#96968b]">Languages</p><p className="mt-2 text-lead">{detail.languages.map((language) => language.name).join(" · ") || "Not specified"}</p></div><div><p className="text-meta text-[#96968b]">Zones</p><p className="mt-2 text-lead">{detail.zones.map((zone) => zone.name).join(" · ") || "Not assigned"}</p></div><div><p className="text-meta text-[#96968b]">Max tours per day</p><p className="mt-2 text-lead">{detail.guide.max_tours_per_day}</p></div></div>}
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
  return <section className="mt-5 bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4 border-b border-[#ecebe5] pb-5"><div><h2 className="font-serif text-xl">Blocked dates</h2><p className="mt-2 text-meta text-[#96968b]">Dates when this guide is unavailable for assignments</p></div><button type="button" onClick={onAdd} className="h-9 bg-[#292b26] px-3 text-meta font-medium text-white hover:bg-[#3a3d34]">+ Add dates</button></div>{showForm && <form onSubmit={onSubmit} className="mt-5 grid gap-3 border-b border-[#ecebe5] pb-5 sm:grid-cols-[1fr_1fr_1.4fr_auto]"><label className="text-meta text-[#77786f]">Start date<DateInput value={draft.start_date} max={draft.end_date || undefined} onChange={(start_date) => onChange({ ...draft, start_date })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-body outline-none focus:border-[#b5a786]" ariaLabel="From" clearable={false} /></label><label className="text-meta text-[#77786f]">End date<DateInput value={draft.end_date} min={draft.start_date || undefined} onChange={(end_date) => onChange({ ...draft, end_date })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-body outline-none focus:border-[#b5a786]" ariaLabel="To" clearable={false} /></label><label className="text-meta text-[#77786f]">Reason<input value={draft.reason} onChange={(event) => onChange({ ...draft, reason: event.target.value })} placeholder="Holiday or personal leave" className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-body outline-none focus:border-[#b5a786]" /></label><span className="flex items-end gap-1.5"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-3 text-meta font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : editingId ? "Save" : "Add"}</button><button type="button" onClick={onCancel} className="h-9 border border-[#deddd6] bg-white px-3 text-meta text-[#77786f]">Cancel</button></span></form>}{error && <p role="alert" className="mt-4 text-body text-[#9b6f37]">{error}</p>}{isLoading && <p className="mt-5 text-body text-[#85867c]">Loading availability...</p>}{!isLoading && !error && availabilities.length === 0 && <p className="mt-5 text-body text-[#85867c]">No blocked dates.</p>}{!isLoading && availabilities.length > 0 && <div className="mt-5 divide-y divide-[#f0efe9]">{availabilities.map((availability) => <div key={availability.id} className="grid items-center gap-3 py-4 text-meta sm:grid-cols-[150px_150px_1fr_auto]"><div><p className="text-label text-[#96968b]">START</p><p className="mt-1">{toDateInput(availability.start_date)}</p></div><div><p className="text-label text-[#96968b]">END</p><p className="mt-1">{toDateInput(availability.end_date)}</p></div><p className="text-[#77786f]">{availability.reason || "No reason provided"}</p><span className="flex gap-2 text-label"><button type="button" onClick={() => { onEdit(availability); }} className="underline underline-offset-2">Edit</button><button type="button" onClick={() => onDelete(availability)} className="text-[#9b6f37] underline underline-offset-2">Delete</button></span></div>)}</div>}</section>;
}
