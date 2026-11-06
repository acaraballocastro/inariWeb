"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/features/dashboard/components/Combobox";
import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { Select } from "@/features/dashboard/components/Select";
import { applyItineraryTemplate, createItineraryTemplateFromDay, listItineraryTemplates, type ApplyTemplateMode, type ItineraryTemplateSummary, type TourDay } from "@/features/tours/api";

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";

type Scope = "day" | "all";

/**
 * ADMIN actions between a day's itinerary and the reusable templates: apply a
 * template (its stops are copied, replacing or after the day's) to `tourDay`
 * or, with `allTourDays`, to every day of the reservation; and save the day's
 * itinerary as a new template. `onApplied` reloads the itineraries shown.
 */
export function ItineraryTemplateBar({ tourDay, allTourDays, stopCount, disabled = false, onApplied }: { tourDay: TourDay; allTourDays?: TourDay[]; stopCount: number; disabled?: boolean; onApplied: (tourDayIds: string[]) => void }) {
  const { confirm, prompt } = useDialogs();
  const [templates, setTemplates] = useState<ItineraryTemplateSummary[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [mode, setMode] = useState<ApplyTemplateMode>("REPLACE");
  const [scope, setScope] = useState<Scope>("day");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Loaded when the form opens the first time.
  useEffect(() => {
    if (!isOpen || templates !== null) return;
    let active = true;
    listItineraryTemplates()
      .then((items) => { if (active) setTemplates(items); })
      .catch((requestError: unknown) => { if (active) { setTemplates([]); setError(requestError instanceof Error ? requestError.message : "Could not load the templates."); } });
    return () => { active = false; };
  }, [isOpen, templates]);

  // The templates of the day's zone first, then those without zone.
  const options = useMemo(() => [...(templates ?? [])]
    .sort((a, b) => rank(a, tourDay.zone_id) - rank(b, tourDay.zone_id) || a.name.localeCompare(b.name))
    .map((template) => ({ id: template.id, label: template.name, detail: `${template.item_count} stop${template.item_count === 1 ? "" : "s"}${template.zone_id && template.zone_id === tourDay.zone_id ? " · this zone" : ""}` })), [templates, tourDay.zone_id]);

  const otherDays = (allTourDays ?? []).filter((day) => day.id !== tourDay.id);
  const targets = scope === "all" && otherDays.length > 0 ? [tourDay, ...otherDays] : [tourDay];

  async function handleApply() {
    const template = templates?.find((item) => item.id === templateId);
    if (!template) { setError("Select a template."); return; }
    const where = targets.length === 1 ? "this day" : `all ${targets.length} days`;
    if (mode === "REPLACE" && !await confirm({ title: `Replace the itinerary of ${where}?`, message: `The current stops are replaced by the ${template.item_count} of "${template.name}". Later changes to the template do not affect the days.`, confirmLabel: "Replace itinerary", tone: "danger" })) return;
    setIsSaving(true); setError(""); setNotice("");
    try {
      await applyItineraryTemplate(template.id, targets.map((day) => day.id), mode);
      setNotice(`"${template.name}" applied to ${where}.`);
      setIsOpen(false); setTemplateId("");
      onApplied(targets.map((day) => day.id));
    } catch (requestError) {
      // All the days or none: nothing was changed.
      setError(requestError instanceof Error ? requestError.message : "Could not apply the template.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAsTemplate() {
    const name = await prompt({ title: "Save as template", message: "A copy of this day's stops is kept as a reusable itinerary. Changing the day later does not change the template.", label: "Template name", placeholder: tourDay.title || "e.g. Kyoto classic day", confirmLabel: "Save template" });
    if (!name?.trim()) return;
    setIsSaving(true); setError(""); setNotice("");
    try {
      const created = await createItineraryTemplateFromDay(tourDay.id, { name: name.trim(), description: null, zone_id: tourDay.zone_id });
      setNotice(`Saved as template "${created.name}".`);
      setTemplates(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save the template.");
    } finally {
      setIsSaving(false);
    }
  }

  const busy = disabled || isSaving;

  return (
    <div className="mt-4 border-y border-[#ecebe5] py-3">
      <div className="flex flex-wrap items-center gap-2 text-meta">
        <button type="button" disabled={busy} onClick={() => { setIsOpen((current) => !current); setError(""); setNotice(""); }} className={`h-8 px-3 disabled:opacity-50 ${isOpen ? "bg-[#e9e5d7]" : "border border-[#deddd6] hover:bg-[#f8f7f3]"}`}>Apply template</button>
        <button type="button" disabled={busy || stopCount === 0} title={stopCount === 0 ? "Add stops first" : undefined} onClick={handleSaveAsTemplate} className="h-8 border border-[#deddd6] px-3 hover:bg-[#f8f7f3] disabled:opacity-50">Save as template</button>
        <Link href="/itinerary-templates" className="ml-auto text-[#77786f] underline underline-offset-2">Templates</Link>
      </div>
      {error && <p role="alert" className="mt-3 text-body text-[#9b6f37]">{error}</p>}
      {notice && <p role="status" className="mt-3 text-body text-[#68705d]">{notice}</p>}
      {isOpen && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {templates === null && <p className="text-body text-[#85867c] sm:col-span-2">Loading templates…</p>}
          {templates?.length === 0 && <p className="text-body text-[#85867c] sm:col-span-2">No templates yet. Save a day as template or create one in <Link href="/itinerary-templates" className="underline">Templates</Link>.</p>}
          {templates && templates.length > 0 && <label className="text-meta sm:col-span-2">Template<Combobox value={templateId} options={options} onChange={setTemplateId} noun="template" placeholder="Search a template..." disabled={busy} inputClass={inputClass} /></label>}
          <label className="text-meta">Stops of the day<Select value={mode} onChange={(value) => setMode(value as ApplyTemplateMode)} options={[{ value: "REPLACE", label: "Replace them" }, { value: "APPEND", label: "Keep them, add after" }]} disabled={busy} className={inputClass} ariaLabel="Stops of the day" /></label>
          {otherDays.length > 0 && <label className="text-meta">Apply to<Select value={scope} onChange={(value) => setScope(value as Scope)} options={[{ value: "day", label: "This day" }, { value: "all", label: `All ${otherDays.length + 1} days` }]} disabled={busy} className={inputClass} ariaLabel="Apply to" /></label>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={busy || !templateId} onClick={handleApply} className="h-9 bg-[#292b26] px-4 text-meta text-white hover:bg-[#41443b] disabled:opacity-50">{isSaving ? "Applying..." : "Apply"}</button>
            <button type="button" disabled={isSaving} onClick={() => setIsOpen(false)} className="h-9 border border-[#deddd6] px-4 text-meta hover:bg-[#f8f7f3] disabled:opacity-50">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function rank(template: ItineraryTemplateSummary, zoneId: string | null) {
  if (zoneId && template.zone_id === zoneId) return 0;
  return template.zone_id ? 2 : 1;
}
