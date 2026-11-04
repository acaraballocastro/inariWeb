"use client";

import { Select } from "@/features/dashboard/components/Select";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { changeIncidentStatus, formatIncidentStatus, getIncident, incidentStatusClass, nextIncidentStatuses, type IncidentDetail, type IncidentStatus } from "@/features/incidents/api";
import { listUsers, type User } from "@/features/users/api";
import { isAdmin } from "@/lib/api/client";
import { useSession } from "@/lib/api/useSession";
import { formatJst } from "@/lib/datetime";

export function IncidentDetailScreen({ incidentId }: { incidentId: string }) {
  const session = useSession();
  const admin = isAdmin(session);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const { missing, report } = useMissingData();
  const [nextStatus, setNextStatus] = useState<IncidentStatus | "">("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getIncident(incidentId)
      .then((result) => { if (active) setIncident(result); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the incident."); });
    return () => { active = false; };
  }, [incidentId]);

  // Names for the history; only admins can list users.
  useEffect(() => {
    if (admin) listUsers().then((items) => setUsers(items ?? [])).catch(() => { setUsers([]); report("user names"); });
  }, [admin, report]);

  const userNames = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);
  const options = incident ? nextIncidentStatuses(incident.status) : [];

  function who(userId: string | null) {
    if (!userId) return "System";
    if (userId === session?.userId) return "You";
    return userNames.get(userId) ?? (admin ? "User" : "Operations team");
  }

  async function handleChangeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!incident || !nextStatus) return;
    setIsSaving(true); setError("");
    try {
      await changeIncidentStatus(incident.id, nextStatus, reason.trim());
      setIncident(await getIncident(incident.id));
      setNextStatus(""); setReason("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not change the status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Incidents" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Incidents / Detail" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[900px]">
            <Link href="/incidents" className="mt-8 inline-flex bg-[#e9e5d7] px-3 py-2 text-meta text-[#5d5e55] hover:bg-[#ded8c7]">← Incidents</Link>
            {error && <p role="alert" className="mt-6 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
            <MissingDataNotice missing={missing} className="mt-6" />
            {!incident && !error && <p className="mt-6 text-body text-[#85867c]">Loading incident...</p>}
            {incident && <>
              <header className="border-b border-[#deddd6] pb-6 pt-6">
                <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">INCIDENT / {formatJst(incident.created_at, { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">{incident.title || "Untitled incident"}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-meta">
                  <span className={`px-3 py-1 ${incidentStatusClass(incident.status)}`}>{formatIncidentStatus(incident.status)}</span>
                  {incident.tour_day_id && <Link href={`/tours/${incident.tour_day_id}`} className="border border-[#deddd6] px-3 py-1 text-[#5d5e55] hover:bg-white">Open tour day</Link>}
                </div>
              </header>

              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(250px,0.8fr)]">
                <div className="space-y-5">
                  <section className="bg-white p-5 sm:p-6">
                    <h2 className="font-serif text-xl">Description</h2>
                    <p className="mt-4 whitespace-pre-line text-lead leading-relaxed text-[#55574f]">{incident.description || "No description provided."}</p>
                  </section>
                  <section className="bg-white p-5 sm:p-6">
                    <h2 className="font-serif text-xl">Status history</h2>
                    {incident.history?.length ? (
                      <ol className="mt-5 space-y-4">
                        {incident.history.map((change) => (
                          <li key={change.id} className="grid grid-cols-[70px_1fr] gap-3 text-meta">
                            <span className="text-[#9b8353]">{formatJst(change.created_at, { day: "2-digit", month: "short" })}<span className="block text-label text-[#aaa99f]">{formatJst(change.created_at, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span></span>
                            <div><p>{change.previous_status ? `${formatIncidentStatus(change.previous_status)} → ` : ""}{formatIncidentStatus(change.new_status)}</p><p className="mt-1 text-label text-[#85867c]">{who(change.changed_by)}</p>{change.reason && <p className="mt-1 leading-relaxed text-[#85867c]">{change.reason}</p>}</div>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="mt-4 text-body text-[#85867c]">Reported, no status changes yet.</p>}
                  </section>
                </div>

                <aside className="space-y-5">
                  {admin && (
                    <section className="bg-white p-5 sm:p-6">
                      <h2 className="font-serif text-xl">Change status</h2>
                      {options.length === 0 ? <p className="mt-4 text-body text-[#85867c]">Closed incidents are final.</p> : (
                        <form onSubmit={handleChangeStatus} className="mt-4 space-y-3">
                          <label className="block text-meta">New status<Select value={nextStatus} onChange={(status) => setNextStatus(status as IncidentStatus)} options={options.map((status) => ({ value: status, label: status === "IN_REVIEW" && incident.status === "RESOLVED" ? "Reopen (in review)" : formatIncidentStatus(status) }))} placeholder="Select a status" className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" ariaLabel="New status" /></label>
                          <label className="block text-meta">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Shown to the guide in the history..." className="mt-2 min-h-16 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 py-2 text-body" /></label>
                          <button type="submit" disabled={isSaving || !nextStatus} className="h-9 w-full bg-[#292b26] text-meta text-white disabled:opacity-50">{isSaving ? "Saving..." : "Update status"}</button>
                        </form>
                      )}
                    </section>
                  )}
                  <section className="bg-[#e9e5d7] p-5 sm:p-6 text-body leading-relaxed text-[#5d5e55]">
                    <p className="text-label font-semibold tracking-[0.2em] text-[#9b8353]">HOW IT WORKS</p>
                    <p className="mt-3">While an incident is open or in review, its tour day is not completed automatically. Once resolved or closed, the day completes on the next pass.</p>
                  </section>
                </aside>
              </div>
            </>}
          </div></div>
        </div>
      </div>
    </main>
  );
}
