"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { listZones, type Zone } from "@/features/catalogs/api";
import { createPlace, deletePlace, listPlaces, updatePlace, type Place, type PlaceInput } from "@/features/places/api";

const inputClass = "h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-[9px] outline-none focus:border-[#b5a786]";
const rowGrid = "grid grid-cols-[minmax(180px,1fr)_minmax(200px,1.4fr)_minmax(130px,0.8fr)_110px_125px] gap-3";

export function PlacesScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listPlaces(), listZones()])
      .then(([placeItems, zoneItems]) => { setPlaces(placeItems); setZones(zoneItems ?? []); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los lugares."))
      .finally(() => setIsLoading(false));
  }, []);

  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return places.filter((place) => (!zoneFilter || place.zone_id === zoneFilter) && `${place.name} ${place.description ?? ""} ${place.zone_id ? zoneNames.get(place.zone_id) ?? "" : ""}`.toLowerCase().includes(normalizedQuery));
  }, [places, query, zoneFilter, zoneNames]);

  async function handleSave(place: Place) {
    setActionError("");
    if (!place.name.trim()) { setActionError("El nombre es obligatorio."); return; }
    try {
      await updatePlace(place.id, toInput(place));
      setPlaces((currentPlaces) => currentPlaces.map((currentPlace) => currentPlace.id === place.id ? place : currentPlace));
      setEditingId(null);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el lugar.");
    }
  }

  async function handleDelete(place: Place) {
    if (!window.confirm(`Delete ${place.name}?`)) return;
    setActionError("");
    try {
      await deletePlace(place.id);
      setPlaces((currentPlaces) => currentPlaces.filter((currentPlace) => currentPlace.id !== place.id));
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el lugar.");
    }
  }

  const active = places.filter((place) => place.is_active).length;
  const zonesInUse = new Set(places.map((place) => place.zone_id).filter(Boolean)).size;

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Places" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Places" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1190px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10"><p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">CONTENT / CATALOG</p><h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Places</h1><p className="mt-2 max-w-[540px] text-[11px] text-[#85867c]">Manage the places available as itinerary stops.</p></header>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Total places", places.length, "Live catalog"], ["Active", active, "Available for itineraries"], ["Inactive", places.length - active, "Hidden from selectors"], ["Zones", zonesInUse, "With at least one place"]].map(([label, value, note]) => <article key={String(label)} className="min-h-[100px] bg-white p-4"><p className="text-[9px] text-[#8b8c82]">{label}</p><p className="mt-3 font-serif text-2xl leading-none">{String(value).padStart(2, "0")}</p><p className="mt-2 text-[8px] text-[#aaa99f]">{note}</p></article>)}</div>
            <section className="mt-5 bg-white p-5 sm:p-6"><div className="flex flex-col gap-4 border-b border-[#ecebe5] pb-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-serif text-xl">Place catalog</h2><p className="mt-2 text-[9px] text-[#96968b]">Live data from InariOps</p></div><button type="button" onClick={() => setShowCreate((current) => !current)} className="h-9 bg-[#292b26] px-4 text-[9px] font-medium text-white hover:bg-[#3a3d34]">+ Add place</button></div>
              {showCreate && <CreateForm zones={zones} onCreated={(place) => { setPlaces((currentPlaces) => [...currentPlaces, place]); setShowCreate(false); }} onError={setActionError} />}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="flex-1 text-[9px]"><span className="mb-2 block">Search places</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, description or zone..." className={inputClass} /></label><label className="text-[9px] sm:w-48"><span className="mb-2 block">Zone</span><ZoneSelect zones={zones} value={zoneFilter} onChange={setZoneFilter} emptyLabel="All zones" /></label><button type="button" onClick={() => { setQuery(""); setZoneFilter(""); }} className="h-9 self-end border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]">Reset</button></div>
              {actionError && <p role="alert" className="mt-4 text-[10px] text-[#9b6f37]">{actionError}</p>}{isLoading && <p className="mt-6 text-[10px] text-[#85867c]">Loading...</p>}{error && <p role="alert" className="mt-6 text-[10px] text-[#9b6f37]">{error}</p>}{!isLoading && !error && filteredPlaces.length === 0 && <p className="mt-6 text-[10px] text-[#85867c]">No results found.</p>}
              {!isLoading && !error && filteredPlaces.length > 0 && <div className="mt-6 overflow-x-auto"><div className="min-w-[820px]"><div className={`${rowGrid} border-b border-[#ecebe5] pb-3 text-[8px] font-semibold tracking-[0.16em] text-[#a19a87]`}><span>NAME</span><span>DESCRIPTION</span><span>ZONE</span><span>STATUS</span><span>ACTIONS</span></div><div className="divide-y divide-[#f0efe9]">{filteredPlaces.map((place) => editingId === place.id ? <EditablePlaceRow key={place.id} place={place} zones={zones} onCancel={() => setEditingId(null)} onSave={handleSave} /> : <div key={place.id} className={`${rowGrid} items-center py-4 text-[9px] hover:bg-[#fbfaf7]`}><span className="text-[10px]">{place.name}</span><span className="truncate text-[8px] text-[#85867c]" title={place.description ?? undefined}>{place.description || "—"}</span><span className="text-[8px] text-[#85867c]">{place.zone_id ? zoneNames.get(place.zone_id) ?? "Unknown zone" : "No zone"}</span><span className={`px-2 py-1 text-center text-[8px] ${place.is_active ? "bg-[#eef0e9] text-[#68705d]" : "bg-[#f2e8d8] text-[#9b6f37]"}`}>{place.is_active ? "Active" : "Inactive"}</span><span className="flex gap-2 text-[8px]"><button type="button" onClick={() => setEditingId(place.id)} className="underline underline-offset-2">Edit</button><button type="button" onClick={() => handleDelete(place)} className="text-[#9b6f37] underline underline-offset-2">Delete</button></span></div>)}</div></div></div>}
              <p className="mt-5 text-[9px] text-[#96968b]">{filteredPlaces.length} places shown · Live catalog data</p>
            </section><footer className="pt-8 text-[9px] tracking-[0.03em] text-[#a09f94]">INARI TOURS · Connected to InariOps</footer>
          </div></div>
        </div>
      </div>
    </main>
  );
}

function toInput(place: Pick<Place, "name" | "description" | "zone_id" | "is_active">): PlaceInput {
  return { name: place.name.trim(), description: place.description?.trim() || null, zone_id: place.zone_id || null, is_active: place.is_active };
}

function ZoneSelect({ zones, value, onChange, emptyLabel }: { zones: Zone[]; value: string; onChange: (value: string) => void; emptyLabel: string }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="">{emptyLabel}</option>{zones.filter((zone) => zone.is_active || zone.id === value).map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select>;
}

function CreateForm({ zones, onCreated, onError }: { zones: Zone[]; onCreated: (place: Place) => void; onError: (message: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!name.trim()) { onError("Completa los campos requeridos."); return; } setIsSaving(true); onError(""); try { onCreated(await createPlace(toInput({ name, description, zone_id: zoneId, is_active: true }))); } catch (requestError) { onError(requestError instanceof Error ? requestError.message : "No se pudo crear el lugar."); } finally { setIsSaving(false); } }
  return <form onSubmit={submit} className="mt-5 grid gap-3 border-b border-[#ecebe5] pb-5 sm:grid-cols-2 lg:grid-cols-4"><label className="text-[9px] text-[#77786f]">Name *<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Fushimi Inari Taisha" className={`${inputClass} mt-2`} /></label><label className="text-[9px] text-[#77786f]">Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Shrine with thousands of torii gates" className={`${inputClass} mt-2`} /></label><label className="text-[9px] text-[#77786f]">Zone<span className="mt-2 block"><ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} emptyLabel="No zone" /></span></label><button type="submit" disabled={isSaving} className="h-9 self-end bg-[#292b26] px-4 text-[9px] font-medium text-white disabled:opacity-60">{isSaving ? "Creating..." : "Create"}</button></form>;
}

function EditablePlaceRow({ place, zones, onCancel, onSave }: { place: Place; zones: Zone[]; onCancel: () => void; onSave: (place: Place) => void }) {
  const [name, setName] = useState(place.name);
  const [description, setDescription] = useState(place.description ?? "");
  const [zoneId, setZoneId] = useState(place.zone_id ?? "");
  const [isActive, setIsActive] = useState(place.is_active);
  const updated: Place = { ...place, ...toInput({ name, description, zone_id: zoneId, is_active: isActive }) };
  return <div className={`${rowGrid} items-center bg-white py-3 text-[9px]`}><input aria-label="Edit name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /><input aria-label="Edit description" value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /><ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} emptyLabel="No zone" /><label className="flex h-9 cursor-pointer items-center gap-2 border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-[9px] text-[#77786f]"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="sr-only" /><span className={`flex h-3.5 w-3.5 items-center justify-center border text-[9px] ${isActive ? "border-[#9b8353] bg-[#9b8353] text-white" : "border-[#cfcabb] bg-white text-transparent"}`}>✓</span><span>{isActive ? "Active" : "Inactive"}</span></label><span className="flex gap-1.5"><button type="button" onClick={() => onSave(updated)} className="h-9 bg-[#292b26] px-2.5 text-[8px] font-medium text-white">Save</button><button type="button" onClick={onCancel} className="h-9 border border-[#deddd6] bg-white px-2.5 text-[8px] text-[#77786f]">Cancel</button></span></div>;
}
