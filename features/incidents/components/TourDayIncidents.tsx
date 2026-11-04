"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createIncident, formatIncidentStatus, incidentStatusClass, listTourDayIncidents, type Incident } from "@/features/incidents/api";
import { formatJst } from "@/lib/datetime";

const inputClass = "mt-2 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";

/** Incidents of one tour day; its guide and the admins can report new ones. */
export function TourDayIncidents({ tourDayId, canReport, onChange }: { tourDayId: string; canReport: boolean; onChange?: () => void }) {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "" });

  useEffect(() => {
    let active = true;
    listTourDayIncidents(tourDayId)
      .then((items) => { if (active) setIncidents(items); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the incidents."); });
    return () => { active = false; };
  }, [tourDayId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) { setError("Give the incident a title."); return; }
    setIsSaving(true); setError("");
    try {
      await createIncident(tourDayId, { title: draft.title.trim(), description: draft.description.trim() });
      setIncidents(await listTourDayIncidents(tourDayId));
      setDraft({ title: "", description: "" });
      setIsReporting(false);
      onChange?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not report the incident.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-serif text-xl">Incidents</h2><p className="mt-2 text-body text-[#85867c]">Open incidents keep the day from being completed.</p></div>
        {canReport && !isReporting && <button type="button" onClick={() => { setError(""); setIsReporting(true); }} className="h-9 shrink-0 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3]">+ Report</button>}
      </div>
      {error && <p role="alert" className="mt-4 text-body text-[#9b6f37]">{error}</p>}
      {isReporting && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-b border-[#ecebe5] pb-5">
          <label className="block text-meta">Title *<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What happened?" className={`${inputClass} h-9`} /></label>
          <label className="block text-meta">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Details for the operations team..." className={`${inputClass} min-h-20 py-2`} /></label>
          <div className="flex gap-2"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-4 text-meta text-white disabled:opacity-60">{isSaving ? "Reporting..." : "Report incident"}</button><button type="button" onClick={() => setIsReporting(false)} className="h-9 border border-[#deddd6] px-4 text-meta">Cancel</button></div>
        </form>
      )}
      {!incidents && !error && <p className="mt-4 text-body text-[#85867c]">Loading incidents...</p>}
      {incidents?.length === 0 && <p className="mt-4 text-body text-[#85867c]">No incidents reported.</p>}
      {incidents && incidents.length > 0 && (
        <div className="mt-4 divide-y divide-[#ecebe5]">
          {incidents.map((incident) => (
            <Link key={incident.id} href={`/incidents/${incident.id}`} className="flex items-start justify-between gap-3 py-3 hover:bg-[#fbfaf7]">
              <div className="min-w-0"><p className="truncate text-body">{incident.title || "Untitled incident"}</p><p className="mt-1 text-label text-[#85867c]">{formatJst(incident.created_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</p></div>
              <span className={`shrink-0 px-2 py-1 text-label ${incidentStatusClass(incident.status)}`}>{formatIncidentStatus(incident.status)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
