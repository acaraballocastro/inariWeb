"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { Pagination } from "@/features/dashboard/components/Pagination";
import { listGuides, type GuideDetail } from "@/features/guides/api";
import { formatIncidentStatus, incidentStatusClass, incidentStatuses, listIncidentsPage, type Incident, type IncidentStatus } from "@/features/incidents/api";
import { isAdmin } from "@/lib/api/client";
import { useSession } from "@/lib/api/useSession";
import { formatJst } from "@/lib/datetime";

type StatusFilter = "ACTIVE" | "ALL" | IncidentStatus;

const pageSize = 50;

export function IncidentsScreen() {
  const session = useSession();
  const admin = isAdmin(session);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [offset, setOffset] = useState(0);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [total, setTotal] = useState(0);
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const { missing, report } = useMissingData();

  useEffect(() => {
    let active = true;
    const status: IncidentStatus[] | undefined = statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE" ? ["OPEN", "IN_REVIEW"] : [statusFilter];
    listIncidentsPage({ status }, { limit: pageSize, offset })
      .then((page) => { if (active) { setIncidents(page.items); setTotal(page.total); setError(""); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the incidents."); });
    return () => { active = false; };
  }, [statusFilter, offset]);

  // Guide names are only a label, and only admins can list guides.
  useEffect(() => {
    if (admin) listGuides().then((items) => setGuides(items ?? [])).catch(() => { setGuides([]); report("guides"); });
  }, [admin, report]);

  const guideNames = useMemo(() => new Map(guides.map((item) => [item.guide.id, item.guide.name])), [guides]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (incidents ?? []).filter((incident) => `${incident.title ?? ""} ${incident.description ?? ""}`.toLowerCase().includes(normalized));
  }, [incidents, query]);

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Incidents" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Incidents" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1190px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
              <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS / INCIDENTS</p>
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Incidents</h1>
              <p className="mt-2 max-w-[560px] text-lead text-[#85867c]">{admin ? "Everything reported on tour days. Days with open or in-review incidents are not completed automatically." : "Incidents you reported and those of the days assigned to you. Report new ones from the tour day."}</p>
            </header>

            <section className="mt-5 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {(["ACTIVE", "ALL", ...incidentStatuses] as StatusFilter[]).map((filter) => (
                  <button key={filter} type="button" onClick={() => { setStatusFilter(filter); setOffset(0); }} className={`h-8 px-3 text-meta ${statusFilter === filter ? "bg-[#292b26] text-white" : "border border-[#deddd6] text-[#66685f] hover:bg-[#f8f7f3]"}`}>
                    {filter === "ACTIVE" ? "Open & in review" : filter === "ALL" ? "All" : formatIncidentStatus(filter)}
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-meta">Search this page<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title or description..." className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label>

              {error && <p role="alert" className="mt-5 text-body text-[#9b6f37]">{error}</p>}
              <MissingDataNotice missing={missing} className="mt-5" />
              {!incidents && !error && <p className="mt-5 text-body text-[#85867c]">Loading incidents...</p>}
              {incidents && filtered.length === 0 && <p className="mt-5 text-body text-[#85867c]">No incidents found.</p>}
              {filtered.length > 0 && (
                <div className="mt-5 divide-y divide-[#ecebe5]">
                  {filtered.map((incident) => (
                    <Link key={incident.id} href={`/incidents/${incident.id}`} className="grid gap-2 py-4 hover:bg-[#fbfaf7] sm:grid-cols-[110px_minmax(0,1fr)_150px_100px] sm:items-start sm:gap-4">
                      <span className="text-meta text-[#9b8353]">{formatJst(incident.created_at, { day: "2-digit", month: "short", year: "numeric" })}</span>
                      <div className="min-w-0"><p className="text-lead">{incident.title || "Untitled incident"}</p>{incident.description && <p className="mt-1 line-clamp-2 text-meta leading-relaxed text-[#85867c]">{incident.description}</p>}</div>
                      <span className="text-meta text-[#85867c]">{admin ? (incident.guide_id ? guideNames.get(incident.guide_id) ?? "Guide" : "No guide") : ""}</span>
                      <span className={`w-fit px-2 py-1 text-label ${incidentStatusClass(incident.status)}`}>{formatIncidentStatus(incident.status)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {incidents && <Pagination offset={offset} limit={pageSize} total={total} onChange={setOffset} noun="incidents" />}
            </section>
          </div></div>
        </div>
      </div>
    </main>
  );
}
