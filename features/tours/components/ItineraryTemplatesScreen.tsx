"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { listZones, type Zone } from "@/features/catalogs/api";
import { Combobox } from "@/features/dashboard/components/Combobox";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { Select } from "@/features/dashboard/components/Select";
import { TimeInput } from "@/features/dashboard/components/TimeInput";
import { createItineraryTemplate, deleteItineraryTemplate, getItineraryTemplate, listItineraryActivities, listItineraryPlaces, listItineraryTemplates, updateItineraryTemplate, type ItineraryActivity, type ItineraryPlace, type ItineraryTemplate, type ItineraryTemplateInput, type ItineraryTemplateSummary } from "@/features/tours/api";
import { formatJst } from "@/lib/datetime";
import { withFallback } from "@/lib/missing";

const stopTypes = ["PLACE", "ACTIVITY", "OTHER"] as const;
const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";

type StopDraft = { key: string; start_time: string; end_time: string; type: string; place_id: string; activity_id: string; notes: string };
type TemplateDraft = { name: string; description: string; zone_id: string; stops: StopDraft[] };

let nextKey = 0;
const newKey = () => `stop-${++nextKey}`;

/**
 * Reusable itineraries (ADMIN). A template is applied from a tour day or from
 * the third step of a new reservation; applying copies its stops, so editing
 * or deleting a template here never changes days already set up.
 */
export function ItineraryTemplatesScreen() {
  const { confirm } = useDialogs();
  const [templates, setTemplates] = useState<ItineraryTemplateSummary[] | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [places, setPlaces] = useState<ItineraryPlace[]>([]);
  const [activities, setActivities] = useState<ItineraryActivity[]>([]);
  const [zoneFilter, setZoneFilter] = useState("");
  const [query, setQuery] = useState("");
  // "new", a template id, or null when nothing is open.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { missing, report } = useMissingData();

  useEffect(() => {
    let active = true;
    const failed: string[] = [];
    Promise.all([
      listItineraryTemplates(),
      withFallback(listZones().then((items) => items ?? []), [], "zones", failed),
      withFallback(listItineraryPlaces(), [], "places", failed),
      withFallback(listItineraryActivities(), [], "activities", failed),
    ])
      .then(([templateItems, zoneItems, placeItems, activityItems]) => { if (!active) return; setTemplates(templateItems); setZones(zoneItems); setPlaces(placeItems); setActivities(activityItems); failed.forEach(report); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the templates."); });
    return () => { active = false; };
  }, [report]);

  const zoneName = (id: string | null) => (id ? zones.find((zone) => zone.id === id)?.name ?? "Unknown zone" : "Any zone");

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (templates ?? []).filter((template) => (!zoneFilter || template.zone_id === zoneFilter) && `${template.name} ${template.description ?? ""}`.toLowerCase().includes(normalized));
  }, [templates, zoneFilter, query]);

  async function openTemplate(id: string) {
    setError(""); setNotice("");
    if (id === "new") { setEditingId("new"); setDraft({ name: "", description: "", zone_id: zoneFilter, stops: [] }); return; }
    setEditingId(id); setDraft(null);
    try {
      setDraft(toDraft(await getItineraryTemplate(id)));
    } catch (requestError) {
      setEditingId(null);
      setError(requestError instanceof Error ? requestError.message : "Could not load the template.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !editingId) return;
    const result = toInput(draft);
    if ("error" in result) { setError(result.error); return; }
    setIsSaving(true); setError(""); setNotice("");
    try {
      const saved = editingId === "new" ? await createItineraryTemplate(result.input) : await updateItineraryTemplate(editingId, result.input);
      setTemplates(await listItineraryTemplates());
      setEditingId(saved.id); setDraft(toDraft(saved));
      setNotice(editingId === "new" ? `Template "${saved.name}" created.` : "Changes saved. Days that already use this template keep their stops.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save the template.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(template: ItineraryTemplateSummary) {
    if (!await confirm({ title: `Delete "${template.name}"?`, message: "Days where it was applied keep their stops.", confirmLabel: "Delete template", tone: "danger" })) return;
    setError(""); setNotice("");
    try {
      await deleteItineraryTemplate(template.id);
      setTemplates((current) => current?.filter((item) => item.id !== template.id) ?? null);
      if (editingId === template.id) { setEditingId(null); setDraft(null); }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete the template.");
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Itinerary templates" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Itinerary templates" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1190px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
              <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">CONTENT / ITINERARIES</p>
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Itinerary templates</h1>
              <p className="mt-2 max-w-[640px] text-lead text-[#85867c]">Reusable itineraries. Apply one from a tour day or from the last step of a new reservation: its stops are copied, so changing or deleting a template here never changes the days already set up.</p>
            </header>

            {error && <p role="alert" className="mt-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}<button type="button" onClick={() => setError("")} className="ml-3 underline">Dismiss</button></p>}
            {notice && <p role="status" className="mt-5 bg-[#eef0e9] p-3 text-body text-[#68705d]">{notice}</p>}
            <MissingDataNotice missing={missing} className="mt-5" />

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
              <section className="h-fit bg-white p-5 sm:p-6">
                <div className="flex items-end justify-between gap-3 border-b border-[#ecebe5] pb-5">
                  <div><h2 className="font-serif text-xl">Templates</h2><p className="mt-2 text-meta text-[#96968b]">{templates ? `${templates.length} saved` : "Loading…"}</p></div>
                  <button type="button" onClick={() => openTemplate("new")} className="h-9 bg-[#292b26] px-4 text-meta font-medium text-white hover:bg-[#3a3d34]">+ New template</button>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <label className="flex-1 text-meta">Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or description..." className={inputClass} /></label>
                  <label className="text-meta sm:w-44">Zone<Select value={zoneFilter} onChange={setZoneFilter} options={[{ value: "", label: "All zones" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]} className={inputClass} ariaLabel="Zone" /></label>
                </div>
                {templates && visible.length === 0 && <p className="mt-5 text-body text-[#85867c]">{templates.length === 0 ? "No templates yet. Create one, or save a tour day's itinerary as a template from the day." : "No templates match."}</p>}
                <div className="mt-4 divide-y divide-[#f0efe9]">
                  {visible.map((template) => (
                    <div key={template.id} className={`flex items-start justify-between gap-3 px-2 py-3 ${editingId === template.id ? "bg-[#f8f7f3]" : "hover:bg-[#fbfaf7]"}`}>
                      <button type="button" onClick={() => openTemplate(template.id)} className="min-w-0 flex-1 text-left">
                        <span className="block text-body font-medium">{template.name}</span>
                        <span className="mt-1 block text-label text-[#85867c]">{[`${template.item_count} stop${template.item_count === 1 ? "" : "s"}`, zoneName(template.zone_id), `Updated ${formatJst(template.updated_at, { day: "numeric", month: "short" })}`].join(" · ")}</span>
                        {template.description && <span className="mt-1 block truncate text-label text-[#a2a299]">{template.description}</span>}
                      </button>
                      <button type="button" onClick={() => handleDelete(template)} className="shrink-0 text-label text-[#9b6f37] underline underline-offset-2">Delete</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="h-fit bg-white p-5 sm:p-6">
                {!editingId && <><h2 className="font-serif text-xl">Template</h2><p className="mt-3 text-body text-[#85867c]">Select a template to edit it, or create a new one.</p></>}
                {editingId && !draft && <p className="text-body text-[#85867c]">Loading template…</p>}
                {editingId && draft && (
                  <TemplateForm draft={draft} zones={zones} places={places} activities={activities} isNew={editingId === "new"} isSaving={isSaving} onChange={setDraft} onSubmit={handleSubmit} onClose={() => { setEditingId(null); setDraft(null); setNotice(""); }} />
                )}
              </section>
            </div>
          </div></div>
        </div>
      </div>
    </main>
  );
}

function TemplateForm({ draft, zones, places, activities, isNew, isSaving, onChange, onSubmit, onClose }: { draft: TemplateDraft; zones: Zone[]; places: ItineraryPlace[]; activities: ItineraryActivity[]; isNew: boolean; isSaving: boolean; onChange: (draft: TemplateDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  // The places of the template's zone first.
  const placeOptions = useMemo(() => [...places].sort((a, b) => Number(b.zone_id === draft.zone_id) - Number(a.zone_id === draft.zone_id)).map((place) => ({ id: place.id, label: place.name, detail: place.zone_name })), [places, draft.zone_id]);
  const activityOptions = useMemo(() => activities.map((activity) => ({ id: activity.id, label: activity.name })), [activities]);
  const zoneOptions = zones.filter((zone) => zone.is_active || zone.id === draft.zone_id).map((zone) => ({ id: zone.id, label: zone.name }));

  const setStop = (key: string, patch: Partial<StopDraft>) => onChange({ ...draft, stops: draft.stops.map((stop) => stop.key === key ? { ...stop, ...patch } : stop) });
  const removeStop = (key: string) => onChange({ ...draft, stops: draft.stops.filter((stop) => stop.key !== key) });
  function moveStop(index: number, direction: -1 | 1) {
    const stops = [...draft.stops];
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    [stops[index], stops[target]] = [stops[target], stops[index]];
    onChange({ ...draft, stops });
  }
  function addStop() {
    const last = draft.stops.at(-1);
    onChange({ ...draft, stops: [...draft.stops, { key: newKey(), start_time: last?.end_time ?? "", end_time: "", type: "PLACE", place_id: "", activity_id: "", notes: "" }] });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-3 border-b border-[#ecebe5] pb-5">
        <h2 className="font-serif text-xl">{isNew ? "New template" : draft.name || "Template"}</h2>
        <button type="button" onClick={onClose} className="text-meta underline underline-offset-2">Close</button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-meta">Name *<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="Kyoto classic day" disabled={isSaving} className={inputClass} /></label>
        <label className="text-meta">Zone<Combobox value={draft.zone_id} options={zoneOptions} onChange={(zone_id) => onChange({ ...draft, zone_id })} noun="zone" placeholder="Search a zone..." emptyLabel="Any zone" disabled={isSaving} inputClass={inputClass} /></label>
        <label className="text-meta sm:col-span-2">Description<textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} placeholder="When to use it..." disabled={isSaving} className="mt-2 min-h-16 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 py-2 text-body outline-none focus:border-[#b5a786]" /></label>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3"><h3 className="font-serif text-lg">Stops</h3><span className="text-meta text-[#9b8353]">{draft.stops.length} STOPS</span></div>
      {draft.stops.length === 0 && <p className="mt-3 text-body text-[#85867c]">No stops yet.</p>}
      <ol className="mt-3 divide-y divide-[#ecebe5] border-y border-[#ecebe5]">
        {draft.stops.map((stop, index) => (
          <li key={stop.key} className="grid gap-3 py-4 sm:grid-cols-[28px_minmax(0,1fr)]">
            <span className="text-meta font-semibold text-[#9b8353]">{index + 1}</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-meta">Start<TimeInput value={stop.start_time} onChange={(start_time) => setStop(stop.key, { start_time })} disabled={isSaving} className={inputClass} ariaLabel={`Start time of stop ${index + 1}`} /></label>
              <label className="text-meta">End<TimeInput value={stop.end_time} onChange={(end_time) => setStop(stop.key, { end_time })} disabled={isSaving} className={inputClass} ariaLabel={`End time of stop ${index + 1}`} /></label>
              <label className="text-meta">Type<Select value={stop.type} onChange={(type) => setStop(stop.key, { type })} options={stopTypes.map((type) => ({ value: type, label: formatType(type) }))} disabled={isSaving} className={inputClass} ariaLabel={`Type of stop ${index + 1}`} /></label>
              {stop.type === "PLACE" && <label className="text-meta sm:col-span-3">Place *<Combobox value={stop.place_id} options={placeOptions} onChange={(place_id) => setStop(stop.key, { place_id })} noun="place" placeholder="Search a place..." disabled={isSaving} inputClass={inputClass} /></label>}
              {stop.type === "ACTIVITY" && <label className="text-meta sm:col-span-3">Activity *<Combobox value={stop.activity_id} options={activityOptions} onChange={(activity_id) => setStop(stop.key, { activity_id })} noun="activity" placeholder="Search an activity..." disabled={isSaving} inputClass={inputClass} /></label>}
              <label className="text-meta sm:col-span-3">Notes<input value={stop.notes} onChange={(event) => setStop(stop.key, { notes: event.target.value })} placeholder="What happens at this stop..." disabled={isSaving} className={inputClass} /></label>
              <div className="flex gap-1 text-meta sm:col-span-3">
                <button type="button" aria-label="Move up" disabled={isSaving || index === 0} onClick={() => moveStop(index, -1)} className="h-8 w-8 border border-[#deddd6] hover:bg-[#f8f7f3] disabled:opacity-40">↑</button>
                <button type="button" aria-label="Move down" disabled={isSaving || index === draft.stops.length - 1} onClick={() => moveStop(index, 1)} className="h-8 w-8 border border-[#deddd6] hover:bg-[#f8f7f3] disabled:opacity-40">↓</button>
                <button type="button" disabled={isSaving} onClick={() => removeStop(stop.key)} className="h-8 border border-[#deddd6] px-3 text-[#9b6f37] hover:bg-[#fbf6ef] disabled:opacity-40">Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" disabled={isSaving} onClick={addStop} className="mt-4 h-9 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3] disabled:opacity-50">+ Add stop</button>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#ecebe5] pt-5">
        <button type="submit" disabled={isSaving} className="h-10 bg-[#292b26] px-6 text-body text-white hover:bg-[#41443b] disabled:opacity-60">{isSaving ? "Saving..." : isNew ? "Create template" : "Save changes"}</button>
        {!isNew && <p className="text-meta text-[#96968b]">Saving does not change the days where the template was already applied.</p>}
      </div>
    </form>
  );
}

function toDraft(template: ItineraryTemplate): TemplateDraft {
  return {
    name: template.name,
    description: template.description ?? "",
    zone_id: template.zone_id ?? "",
    stops: template.items.map((item) => ({ key: newKey(), start_time: toTimeInput(item.start_time), end_time: toTimeInput(item.end_time), type: item.type ?? "OTHER", place_id: item.place_id ?? "", activity_id: item.activity_id ?? "", notes: item.notes ?? "" })),
  };
}

function toInput(draft: TemplateDraft): { input: ItineraryTemplateInput } | { error: string } {
  if (!draft.name.trim()) return { error: "The template needs a name." };
  for (const [index, stop] of draft.stops.entries()) {
    const label = `Stop ${index + 1}`;
    if (stop.start_time && stop.end_time && stop.end_time < stop.start_time) return { error: `${label}: the end time must be later than the start time.` };
    if (stop.type === "PLACE" && !stop.place_id) return { error: `${label}: select a place.` };
    if (stop.type === "ACTIVITY" && !stop.activity_id) return { error: `${label}: select an activity.` };
  }
  return {
    input: {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      zone_id: draft.zone_id || null,
      items: draft.stops.map((stop) => ({
        start_time: stop.start_time || null,
        end_time: stop.end_time || null,
        type: stop.type,
        place_id: stop.type === "PLACE" ? stop.place_id : null,
        activity_id: stop.type === "ACTIVITY" ? stop.activity_id : null,
        notes: stop.notes.trim() || null,
      })),
    },
  };
}

// Itinerary times are JST wall-clock times, "HH:MM:SS" or "0000-01-01THH:MM:SSZ": read as-is.
function toTimeInput(value: string | null) {
  if (!value) return "";
  return value.match(/(\d{2}:\d{2})/)?.[1] ?? value.slice(0, 5);
}

function formatType(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }
