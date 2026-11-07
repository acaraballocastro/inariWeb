"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { TimeInput } from "@/features/dashboard/components/TimeInput";
import { Select } from "@/features/dashboard/components/Select";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createActivity } from "@/features/catalogs/api";
import { Combobox } from "@/features/dashboard/components/Combobox";
import { createPlace } from "@/features/places/api";
import { createItineraryItem, deleteItineraryItem, listItinerary, updateItineraryItem, type ItineraryActivity, type ItineraryItem, type ItineraryItemInput, type ItineraryPlace, type TourDay } from "@/features/tours/api";
import { formatJstClock } from "@/lib/datetime";

const stopTypes = ["PLACE", "ACTIVITY", "OTHER"] as const;

type StopDraft = { start_time: string; end_time: string; type: string; place_id: string; activity_id: string; notes: string };

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";

/** `onPlaceCreated` / `onActivityCreated` let the screen add what is created here to its own lists. */
export function ItineraryEditor({ tourDay, places: givenPlaces, activities: givenActivities, onCountChange, onPlaceCreated, onActivityCreated, readOnly = false }: { tourDay: TourDay; places: ItineraryPlace[]; activities: ItineraryActivity[]; onCountChange?: (count: number) => void; onPlaceCreated?: (place: ItineraryPlace) => void; onActivityCreated?: (activity: ItineraryActivity) => void; readOnly?: boolean }) {
  const { confirm } = useDialogs();
  // What is created here shows at once, whether or not the screen adds it to its lists.
  const [createdPlaces, setCreatedPlaces] = useState<ItineraryPlace[]>([]);
  const [createdActivities, setCreatedActivities] = useState<ItineraryActivity[]>([]);
  const places = useMemo(() => withCreated(givenPlaces, createdPlaces), [givenPlaces, createdPlaces]);
  const activities = useMemo(() => withCreated(givenActivities, createdActivities), [givenActivities, createdActivities]);
  // The places of the day's zone first.
  const placeOptions = useMemo(() => [...places].sort((a, b) => Number(b.zone_id === tourDay.zone_id) - Number(a.zone_id === tourDay.zone_id)).map((place) => ({ id: place.id, label: place.name, detail: place.zone_name })), [places, tourDay.zone_id]);
  const activityOptions = useMemo(() => activities.map((activity) => ({ id: activity.id, label: activity.name })), [activities]);

  // A new place goes in the day's zone.
  async function addPlace(name: string) {
    const created = await createPlace({ name, description: null, address: null, latitude: null, longitude: null, zone_id: tourDay.zone_id, is_active: true });
    const place: ItineraryPlace = { id: created.id, name: created.name, zone_id: created.zone_id, zone_name: null };
    setCreatedPlaces((current) => [...current, place]);
    onPlaceCreated?.(place);
    return { id: place.id, label: place.name };
  }

  async function addActivity(name: string) {
    const created = await createActivity({ name, description: null });
    const activity: ItineraryActivity = { id: created.id, name: created.name };
    setCreatedActivities((current) => [...current, activity]);
    onActivityCreated?.(activity);
    return { id: activity.id, label: activity.name };
  }

  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StopDraft>(toStopDraft(null));

  // Kept in a ref so a new callback on every parent render does not trigger a reload.
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => { onCountChangeRef.current = onCountChange; });

  const applyItems = useCallback((nextItems: ItineraryItem[]) => {
    setItems(nextItems);
    onCountChangeRef.current?.(nextItems.length);
  }, []);

  useEffect(() => {
    let active = true;
    listItinerary(tourDay.id)
      .then((result) => { if (active) applyItems(result); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the itinerary."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [tourDay.id, applyItems]);

  async function runAction(action: () => Promise<unknown>, fallbackMessage: string) {
    setIsSaving(true); setError("");
    try { await action(); applyItems(await listItinerary(tourDay.id)); return true; } catch (requestError) { setError(requestError instanceof Error ? requestError.message : fallbackMessage); return false; } finally { setIsSaving(false); }
  }

  function startCreating() {
    const lastItem = items.at(-1);
    setError(""); setEditingId("new");
    setDraft({ ...toStopDraft(null), start_time: lastItem?.end_time ? toTimeInput(lastItem.end_time) : formatJstClock(tourDay.start_datetime) });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.start_time) { setError("Enter the start time of the stop."); return; }
    if (draft.end_time && draft.end_time < draft.start_time) { setError("The end time must be later than the start time."); return; }
    if (draft.type === "PLACE" && !draft.place_id) { setError("Select a place for this stop."); return; }
    if (draft.type === "ACTIVITY" && !draft.activity_id) { setError("Select an activity for this stop."); return; }

    const editing = items.find((item) => item.id === editingId);
    const input: ItineraryItemInput = {
      order_index: editing ? editing.order_index : Math.max(0, ...items.map((item) => item.order_index)) + 1,
      start_time: draft.start_time,
      end_time: draft.end_time || null,
      type: draft.type,
      place_id: draft.type === "PLACE" ? draft.place_id : null,
      activity_id: draft.type === "ACTIVITY" ? draft.activity_id : null,
      notes: draft.notes.trim() || null,
    };
    const saved = await runAction(() => editing ? updateItineraryItem(tourDay.id, editing.id, input) : createItineraryItem(tourDay.id, input), "Could not save the stop.");
    if (saved) setEditingId(null);
  }

  async function handleDelete(item: ItineraryItem) {
    if (!await confirm({ title: "Remove this stop?", message: "It is taken out of the day's itinerary.", confirmLabel: "Remove stop", tone: "danger" })) return;
    runAction(() => deleteItineraryItem(tourDay.id, item.id), "Could not remove the stop.");
  }

  function handleMove(index: number, direction: -1 | 1) {
    const current = items[index];
    const target = items[index + direction];
    if (!current || !target) return;
    // Two requests swap the positions: if the second fails, the first is undone so
    // no two stops are left with the same position.
    runAction(async () => {
      await updateItineraryItem(tourDay.id, current.id, { order_index: target.order_index });
      try {
        await updateItineraryItem(tourDay.id, target.id, { order_index: current.order_index });
      } catch (requestError) {
        await updateItineraryItem(tourDay.id, current.id, { order_index: current.order_index }).catch(() => undefined);
        throw requestError;
      }
    }, "Could not reorder the itinerary.");
  }

  function describeStop(item: ItineraryItem) {
    if (item.type === "PLACE") { const place = places.find((entry) => entry.id === item.place_id); return place ? [place.name, place.zone_name].filter(Boolean).join(" · ") : "Place"; }
    if (item.type === "ACTIVITY") return activities.find((entry) => entry.id === item.activity_id)?.name ?? "Activity";
    return item.type ? formatType(item.type) : "Stop";
  }

  const stopForm = (submitLabel: string) => (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4 sm:grid-cols-2">
      <label className="text-meta">Start time *<TimeInput value={draft.start_time} onChange={(start_time) => setDraft({ ...draft, start_time })} disabled={isSaving} className={inputClass} ariaLabel="Start time" /></label>
      <label className="text-meta">End time<TimeInput value={draft.end_time} onChange={(end_time) => setDraft({ ...draft, end_time })} disabled={isSaving} className={inputClass} ariaLabel="End time" /></label>
      <label className="text-meta">Type<Select value={draft.type} onChange={(type) => setDraft({ ...draft, type })} options={stopTypes.map((type) => ({ value: type, label: formatType(type) }))} disabled={isSaving} className={inputClass} ariaLabel="Type" /></label>
      {draft.type === "PLACE" && <label className="text-meta">Place *<Combobox value={draft.place_id} options={placeOptions} onChange={(placeId) => setDraft({ ...draft, place_id: placeId })} onCreate={addPlace} noun="place" placeholder="Search or create a place..." disabled={isSaving} inputClass={inputClass} /></label>}
      {draft.type === "ACTIVITY" && <label className="text-meta">Activity *<Combobox value={draft.activity_id} options={activityOptions} onChange={(activityId) => setDraft({ ...draft, activity_id: activityId })} onCreate={addActivity} noun="activity" placeholder="Search or create an activity..." disabled={isSaving} inputClass={inputClass} /></label>}
      <label className="text-meta sm:col-span-2">Notes<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="What happens at this stop..." className="mt-2 min-h-16 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 py-2 text-body outline-none focus:border-[#b5a786]" /></label>
      <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-4 text-meta text-white hover:bg-[#41443b] disabled:opacity-60">{isSaving ? "Saving..." : submitLabel}</button><button type="button" onClick={() => setEditingId(null)} disabled={isSaving} className="h-9 border border-[#deddd6] px-4 text-meta hover:bg-[#f8f7f3] disabled:opacity-50">Cancel</button></div>
    </form>
  );

  return (
    <div>
      {error && <p role="alert" className="mt-4 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
      {isLoading && <p className="mt-5 text-body text-[#85867c]">Loading itinerary...</p>}
      {!isLoading && items.length === 0 && editingId !== "new" && <p className="mt-5 text-body text-[#85867c]">No itinerary items yet.</p>}
      <div className="mt-5 divide-y divide-[#ecebe5]">
        {items.map((item, index) => editingId === item.id ? <div key={item.id}>{stopForm("Save stop")}</div> : (
          <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[72px_20px_minmax(0,1fr)_auto]">
            <span className="text-body text-[#9b8353]">{formatClock(item.start_time)}{item.end_time ? ` – ${formatClock(item.end_time)}` : ""}</span>
            <span className="relative mt-1 flex h-3 w-3 items-center justify-center rounded-full border border-[#b5a786]" aria-hidden="true" />
            <div className="min-w-0"><h3 className="text-lead">{describeStop(item)}</h3><p className="mt-1 text-meta text-[#9b8353]">{item.type ? formatType(item.type) : "Stop"}</p>{item.notes && <p className="mt-2 text-body leading-relaxed text-[#85867c]">{item.notes}</p>}<MapLink url={item.type === "PLACE" ? places.find((entry) => entry.id === item.place_id)?.map_url : null} /></div>
            {!readOnly && <div className="flex items-start gap-1 text-meta">
              <button type="button" aria-label="Move up" disabled={isSaving || editingId !== null || index === 0} onClick={() => handleMove(index, -1)} className="h-8 w-8 border border-[#deddd6] hover:bg-[#f8f7f3] disabled:opacity-40">↑</button>
              <button type="button" aria-label="Move down" disabled={isSaving || editingId !== null || index === items.length - 1} onClick={() => handleMove(index, 1)} className="h-8 w-8 border border-[#deddd6] hover:bg-[#f8f7f3] disabled:opacity-40">↓</button>
              <button type="button" disabled={isSaving || editingId !== null} onClick={() => { setError(""); setEditingId(item.id); setDraft(toStopDraft(item)); }} className="h-8 border border-[#deddd6] px-3 hover:bg-[#f8f7f3] disabled:opacity-40">Edit</button>
              <button type="button" disabled={isSaving || editingId !== null} onClick={() => handleDelete(item)} className="h-8 border border-[#deddd6] px-3 text-[#9b6f37] hover:bg-[#fbf6ef] disabled:opacity-40">Remove</button>
            </div>}
          </article>
        ))}
        {editingId === "new" && stopForm("Add stop")}
      </div>
      {!readOnly && editingId === null && !isLoading && <button type="button" onClick={startCreating} className="mt-4 h-9 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3]">+ Add stop</button>}
    </div>
  );
}

function toStopDraft(item: ItineraryItem | null): StopDraft {
  return { start_time: item?.start_time ? toTimeInput(item.start_time) : "", end_time: item?.end_time ? toTimeInput(item.end_time) : "", type: item?.type ?? "PLACE", place_id: item?.place_id ?? "", activity_id: item?.activity_id ?? "", notes: item?.notes ?? "" };
}

// Itinerary times are JST wall-clock times. The API returns them as "HH:MM:SS"
// or as "0000-01-01THH:MM:SSZ", so the clock is read as-is, never converted.
function toTimeInput(value: string) {
  return value.match(/(\d{2}:\d{2})/)?.[1] ?? value.slice(0, 5);
}

function formatClock(value: string | null) { return value ? toTimeInput(value) : "—"; }
function formatType(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }

function withCreated<T extends { id: string }>(given: T[], created: T[]) {
  const known = new Set(given.map((item) => item.id));
  return [...given, ...created.filter((item) => !known.has(item.id))];
}

/** "Open in the map" for a place with an address or coordinates. */
function MapLink({ url }: { url: string | null | undefined }) {
  if (!url) return null;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-8 items-center text-meta text-[#6f6a5b] underline underline-offset-2 hover:text-[#292b26]">Open in map ↗</a>;
}
