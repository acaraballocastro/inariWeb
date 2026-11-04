"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { createGuide, listGuides, updateGuide, type GuideDetail, type GuideLanguage, type GuideZone } from "@/features/guides/api";
import { createZone, listLanguages, listZones } from "@/features/catalogs/api";
import { RelationSelector } from "@/features/guides/components/RelationSelector";

type Guide = {
  id: string;
  detail: GuideDetail;
  name: string;
  initials: string;
  location: string;
  languages: string;
  capacity: string;
};

export function GuidesScreen() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [languages, setLanguages] = useState<GuideLanguage[]>([]);
  const [zones, setZones] = useState<GuideZone[]>([]);
  // Zones can be created from the guide's zone picker.
  async function addZone(name: string) {
    const zone = await createZone({ name });
    setZones((current) => [...current, zone]);
    return zone;
  }
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newGuide, setNewGuide] = useState({ name: "", email: "", phone: "", maxToursPerDay: "1", languages: [] as GuideLanguage[], zones: [] as GuideZone[] });

  useEffect(() => {
    Promise.all([listGuides(), listLanguages(), listZones()])
      .then(([items, languageItems, zoneItems]) => {
        setGuides(items.map(mapGuide));
        setLanguages(languageItems.filter((language) => language.is_active !== false));
        setZones(zoneItems.filter((zone) => zone.is_active !== false));
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load the guides."))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredGuides = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return guides.filter((guide) => {
      const matchesQuery = !normalizedQuery || `${guide.name} ${guide.location} ${guide.languages}`.toLowerCase().includes(normalizedQuery);
      return matchesQuery;
    });
  }, [guides, query]);

  async function handleUpdateGuide(guide: Guide) {
    setActionError("");
    if (!guide.detail.guide.name.trim() || !guide.detail.guide.email.trim() || guide.detail.guide.max_tours_per_day < 1) {
      setActionError("Enter a name, an email and a valid daily capacity.");
      return;
    }
    try {
      await updateGuide(guide.id, {
        name: guide.detail.guide.name,
        email: guide.detail.guide.email,
        phone: guide.detail.guide.phone,
        max_tours_per_day: guide.detail.guide.max_tours_per_day,
        languages: guide.detail.languages,
        zones: guide.detail.zones,
      });
      setGuides((currentGuides) => currentGuides.map((currentGuide) => currentGuide.id === guide.id ? guide : currentGuide));
      setEditingGuideId(null);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Could not update the guide.");
    }
  }

  async function handleCreateGuide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    setNotice("");
    if (!newGuide.name.trim() || !newGuide.email.trim() || !newGuide.phone.trim() || Number(newGuide.maxToursPerDay) < 1) {
      setActionError("Enter a name, email, phone and daily capacity.");
      return;
    }

    setIsCreating(true);
    try {
      const detail = await createGuide({
        name: newGuide.name.trim(),
        email: newGuide.email.trim(),
        phone: newGuide.phone.trim(),
        max_tours_per_day: Number(newGuide.maxToursPerDay),
        languages: newGuide.languages,
        zones: newGuide.zones,
      });
      setGuides((currentGuides) => [...currentGuides, mapGuide(detail)]);
      setNotice(`Invitation sent to ${newGuide.email.trim()} with a temporary password.`);
      setNewGuide({ name: "", email: "", phone: "", maxToursPerDay: "1", languages: [], zones: [] });
      setShowCreateForm(false);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Could not create the guide.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Guides" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Guides" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
                <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">PEOPLE / AUTUMN 2026</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Guides</h1>
                <p className="mt-2 max-w-[540px] text-lead text-[#85867c]">The people behind every considered journey. Keep your guide network ready for what is next.</p>
              </header>

              <PeopleStats guides={guides} />

              <section className="mt-5 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 border-b border-[#ecebe5] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-serif text-xl">Guide network</h2>
                    <p className="mt-3 text-meta text-[#96968b]">Live directory · Guide profiles and capacity</p>
                  </div>
                  <button type="button" onClick={() => setShowCreateForm((current) => !current)} className="h-9 bg-[#292b26] px-4 text-meta font-medium text-white hover:bg-[#3a3d34]">+ Add guide</button>
                </div>

                {showCreateForm && <form onSubmit={handleCreateGuide} className="mt-5 border-b border-[#ecebe5] pb-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-meta text-[#77786f]">Name<input aria-label="Guide name" value={newGuide.name} onChange={(event) => setNewGuide({ ...newGuide, name: event.target.value })} placeholder="Guide name" className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-meta text-[#77786f]">Email<input aria-label="Guide email" type="email" value={newGuide.email} onChange={(event) => setNewGuide({ ...newGuide, email: event.target.value })} placeholder="guide@example.com" className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-meta text-[#77786f]">Phone<input aria-label="Guide phone" value={newGuide.phone} onChange={(event) => setNewGuide({ ...newGuide, phone: event.target.value })} placeholder="Phone number" className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>
                    <label className="text-meta text-[#77786f]">Max tours per day<input aria-label="Guide max tours per day" type="number" min="1" value={newGuide.maxToursPerDay} onChange={(event) => setNewGuide({ ...newGuide, maxToursPerDay: event.target.value })} placeholder="Daily capacity" className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2"><RelationSelector label="Languages" options={languages} selected={newGuide.languages} onChange={(selected) => setNewGuide({ ...newGuide, languages: selected })} /><RelationSelector label="Zones" options={zones} selected={newGuide.zones} onChange={(selected) => setNewGuide({ ...newGuide, zones: selected })} onCreate={addZone} /></div>
                  <div className="mt-4 flex gap-2"><button type="submit" disabled={isCreating} className="h-9 bg-[#292b26] px-4 text-meta font-medium text-white disabled:opacity-60">{isCreating ? "Creating..." : "Create guide"}</button><button type="button" onClick={() => setShowCreateForm(false)} className="h-9 border border-[#deddd6] bg-white px-4 text-meta text-[#77786f] hover:bg-[#f8f7f3]">Cancel</button></div>
                </form>}

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end">
                  <label className="flex-1 text-meta"><span className="mb-2 block">Search guide</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, location or language..." className="h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none placeholder:text-[#aaa99f] focus:border-[#b5a786]" /></label>
                  <button type="button" onClick={() => setQuery("")} className="h-9 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3]">Reset</button>
                </div>

                {isLoading && <p className="mt-6 text-body text-[#85867c]">Loading guides...</p>}
                {error && <p role="alert" className="mt-6 text-body text-[#9b6f37]">{error}</p>}
                {actionError && <p role="alert" className="mt-6 text-body text-[#9b6f37]">{actionError}</p>}
                {notice && <p role="status" className="mt-6 border border-[#e3e1da] bg-[#f8f7f3] p-3 text-body text-[#55574f]">{notice}</p>}
                {!isLoading && !error && filteredGuides.length === 0 && <p className="mt-6 text-body text-[#85867c]">No guides found.</p>}
                {!isLoading && !error && filteredGuides.length > 0 && <GuideTable guides={filteredGuides} languages={languages} zones={zones} onCreateZone={addZone} editingGuideId={editingGuideId} onEdit={setEditingGuideId} onSave={handleUpdateGuide} />}
                <p className="mt-5 text-meta text-[#96968b]">{filteredGuides.length} guides shown · Search uses live directory data</p>
              </section>
              <footer className="pt-8 text-meta tracking-[0.03em] text-[#a09f94]">INARI TOURS · Connected to InariOps</footer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function mapGuide(detail: GuideDetail): Guide {
  const name = detail.guide.name || detail.guide.email;
  return {
    id: detail.guide.id,
    detail,
    name,
    initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    location: detail.zones.map((zone) => zone.name).join(" · ") || "Unassigned",
    languages: detail.languages.map((language) => language.name).join(" · ") || "Not specified",
    capacity: String(detail.guide.max_tours_per_day),
  };
}

function PeopleStats({ guides }: { guides: Guide[] }) {
  const zones = new Set(guides.flatMap((guide) => guide.location === "Unassigned" ? [] : guide.location.split(" · "))).size;
  const languages = new Set(guides.flatMap((guide) => guide.languages === "Not specified" ? [] : guide.languages.split(" · "))).size;
  const averageTours = guides.length ? Math.round(guides.reduce((total, guide) => total + Number(guide.capacity), 0) / guides.length) : 0;
  const stats = [["Total guides", String(guides.length).padStart(2, "0"), "Live directory"], ["Assigned areas", String(zones).padStart(2, "0"), "From guide profiles"], ["Languages", String(languages).padStart(2, "0"), "Across the network"], ["Avg. daily capacity", averageTours ? String(averageTours) : "—", "From guide profiles"]];
  return <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([label, value, note]) => <article key={label} className="min-h-[100px] bg-white p-4"><p className="text-meta text-[#8b8c82]">{label}</p><p className="mt-3 font-serif text-2xl leading-none">{value}</p><p className="mt-2 text-label text-[#aaa99f]">{note}</p></article>)}</div>;
}

function GuideTable({ guides: items, languages, zones, onCreateZone, editingGuideId, onEdit, onSave }: { guides: Guide[]; languages: GuideLanguage[]; zones: GuideZone[]; onCreateZone: (name: string) => Promise<GuideZone>; editingGuideId: string | null; onEdit: (id: string | null) => void; onSave: (guide: Guide) => void }) {
  const columns = "grid-cols-[minmax(180px,1.25fr)_minmax(125px,0.9fr)_minmax(155px,1.1fr)_minmax(155px,1.1fr)_95px_120px]";
  return <div className="mt-6 overflow-x-auto"><div className="min-w-[900px]"><div className={`grid ${columns} gap-3 border-b border-[#ecebe5] pb-3 text-label font-semibold tracking-[0.16em] text-[#a19a87]`}><span>GUIDE</span><span>CONTACT</span><span>LANGUAGES</span><span>ZONES</span><span>MAX / DAY</span><span>ACTIONS</span></div><div className="divide-y divide-[#f0efe9]">{items.map((guide) => editingGuideId === guide.id ? <EditableGuideRow key={guide.id} guide={guide} languages={languages} zones={zones} onCreateZone={onCreateZone} columns={columns} onCancel={() => onEdit(null)} onSave={onSave} /> : <div key={guide.id} className={`grid ${columns} items-center gap-3 py-4 text-meta hover:bg-[#fbfaf7]`}><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9e5d7] text-label text-[#77786f]">{guide.initials}</span><div><Link href={`/guides/${guide.id}`} className="text-body hover:underline">{guide.name}</Link><p className="mt-1 text-label text-[#9b9c92]">{guide.detail.guide.email}</p></div></div><div className="text-label text-[#85867c]"><p>{guide.detail.guide.phone || "No phone"}</p></div><span className="text-label text-[#85867c]">{guide.languages}</span><span className="text-label text-[#85867c]">{guide.location}</span><span>{guide.capacity}</span><span className="flex gap-2 text-label"><button type="button" onClick={() => onEdit(guide.id)} className="underline underline-offset-2">Edit</button><Link href={`/guides/${guide.id}`} className="text-[#77786f] underline underline-offset-2">View</Link></span></div>)}</div></div></div>;
}

function EditableGuideRow({ guide, languages, zones, onCreateZone, columns, onCancel, onSave }: { guide: Guide; languages: GuideLanguage[]; zones: GuideZone[]; onCreateZone: (name: string) => Promise<GuideZone>; columns: string; onCancel: () => void; onSave: (guide: Guide) => void }) {
  const [draftDetail, setDraftDetail] = useState(guide.detail);
  const updateGuideUser = (field: "name" | "email" | "phone" | "max_tours_per_day", value: string) => setDraftDetail((current) => ({ ...current, guide: { ...current.guide, [field]: field === "max_tours_per_day" ? Number(value) : value } }));
  const nextGuide = { ...guide, detail: draftDetail, name: draftDetail.guide.name, initials: draftDetail.guide.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), capacity: String(draftDetail.guide.max_tours_per_day) };
  const inputClass = "h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-meta text-[#292b26] outline-none transition-colors focus:border-[#b5a786]";
  return <div className={`grid ${columns} items-start gap-3 bg-white py-3 text-meta`}><div className="space-y-2"><input aria-label="Edit guide name" placeholder="Name" value={draftDetail.guide.name} onChange={(event) => updateGuideUser("name", event.target.value)} className={inputClass} /><input aria-label="Edit guide email" type="email" placeholder="Email" value={draftDetail.guide.email} onChange={(event) => updateGuideUser("email", event.target.value)} className={inputClass} /></div><input aria-label="Edit guide phone" placeholder="Phone" value={draftDetail.guide.phone} onChange={(event) => updateGuideUser("phone", event.target.value)} className={inputClass} /><RelationSelector compact label="Languages" options={languages} selected={draftDetail.languages} onChange={(selected) => setDraftDetail((current) => ({ ...current, languages: selected }))} /><RelationSelector compact label="Zones" options={zones} selected={draftDetail.zones} onChange={(selected) => setDraftDetail((current) => ({ ...current, zones: selected }))} onCreate={onCreateZone} /><input aria-label="Edit guide capacity" type="number" min="1" placeholder="Max / day" value={draftDetail.guide.max_tours_per_day} onChange={(event) => updateGuideUser("max_tours_per_day", event.target.value)} className={inputClass} /><span className="flex items-center gap-1.5 text-label"><button type="button" onClick={() => onSave(nextGuide)} className="h-9 bg-[#292b26] px-2.5 font-medium text-white hover:bg-[#3a3d34]">Save</button><button type="button" onClick={onCancel} className="h-9 border border-[#deddd6] bg-white px-2.5 text-[#77786f] hover:bg-[#f8f7f3]">Cancel</button></span></div>;
}
