"use client";

import { DateInput } from "@/features/dashboard/components/DateInput";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { auditEntities, auditEntityHref, auditOutcomes, formatEntity, formatOutcome, listAuditLogPage, outcomeClass, securityActions, type AuditFilter, type AuditOutcome, type AuditRecord } from "@/features/audit/api";
import { Combobox } from "@/features/dashboard/components/Combobox";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { Pagination } from "@/features/dashboard/components/Pagination";
import { Select } from "@/features/dashboard/components/Select";
import { listUsers, type User } from "@/features/users/api";
import { formatJst, startOfJstDay } from "@/lib/datetime";
import { formatStatus } from "@/lib/status";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

const pageSize = 50;
const changeActions = ["CREATED", "UPDATED", "DELETED", "CANCELLED", "DELETED_PERMANENTLY", "STATUS_CHANGED", "PAYMENT_CONFIRMED", "GUIDE_ASSIGNED", "GUIDE_UNASSIGNED"];
const dayMs = 24 * 60 * 60 * 1000;

type Filters = { entity: string; entityId: string; userId: string; action: string; outcome: AuditOutcome | ""; from: string; to: string };
const emptyFilters: Filters = { entity: "", entityId: "", userId: "", action: "", outcome: "", from: "", to: "" };

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]";

/** Who changed what, and when: every change made through the API. */
export function AuditLogScreen() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<{ items: AuditRecord[]; total: number } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { missing, report } = useMissingData();
  const entityId = useDebouncedValue(filters.entityId.trim());

  // Dates are Japan days; "to" includes the whole day.
  const filter = useMemo<AuditFilter>(() => ({
    entity: filters.entity || undefined,
    entityId: entityId || undefined,
    userId: filters.userId || undefined,
    action: filters.action || undefined,
    outcome: filters.outcome || undefined,
    from: filters.from ? startOfJstDay(filters.from).toISOString() : undefined,
    to: filters.to ? new Date(startOfJstDay(filters.to).getTime() + dayMs).toISOString() : undefined,
  }), [filters.entity, filters.userId, filters.action, filters.outcome, filters.from, filters.to, entityId]);

  useEffect(() => {
    let active = true;
    listAuditLogPage(filter, { limit: pageSize, offset })
      .then((page) => { if (active) { setResult(page); setError(""); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the audit log."); });
    return () => { active = false; };
  }, [filter, offset]);

  // Only for the user filter: the entries already carry the author's name.
  useEffect(() => {
    listUsers().then((items) => setUsers([...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => { setUsers([]); report("users"); });
  }, [report]);

  function update(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setOffset(0);
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Audit log" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Audit log" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1190px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
              <p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">WORKSPACE / AUDIT</p>
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Audit log</h1>
              <p className="mt-2 max-w-[620px] text-lead text-[#85867c]">Every change made in the workspace and every sign-in: who, when, from where and what they sent. A change is recorded before it runs, so none happens without its entry. Passwords and tokens are never kept, and the data sent about a user is erased when that user is deleted permanently.</p>
            </header>

            <section className="mt-5 bg-white p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-meta">What<Select ariaLabel="What" value={filters.entity} onChange={(entity) => update({ entity })} options={[{ value: "", label: "Everything" }, ...auditEntities.map((entity) => ({ value: entity, label: formatEntity(entity) }))]} className={inputClass} /></label>
                <label className="text-meta">ID or code<input value={filters.entityId} onChange={(event) => update({ entityId: event.target.value })} placeholder="R00042, a UUID..." className={`${inputClass} placeholder:text-[#aaa99f]`} /></label>
                <label className="text-meta">Who<Combobox ariaLabel="Who" value={filters.userId} onChange={(userId) => update({ userId })} options={users.map((user) => ({ id: user.id, label: user.name, detail: user.email }))} noun="user" emptyLabel="Anyone" inputClass={inputClass} /></label>
                <label className="text-meta">Action<Select ariaLabel="Action" value={filters.action} onChange={(action) => update({ action })} options={[{ label: "", options: [{ value: "", label: "Any action" }] }, { label: "Sign-ins & security", options: securityActions.map((action) => ({ value: action, label: formatStatus(action) })) }, { label: "Changes", options: changeActions.map((action) => ({ value: action, label: formatStatus(action) })) }]} className={inputClass} /></label>
                <label className="text-meta">Outcome<Select ariaLabel="Outcome" value={filters.outcome} onChange={(outcome) => update({ outcome: outcome as AuditOutcome | "" })} options={[{ value: "", label: "Any outcome" }, ...auditOutcomes.map((outcome) => ({ value: outcome, label: formatOutcome(outcome) }))]} className={inputClass} /></label>
                <label className="text-meta">From<DateInput value={filters.from} max={filters.to || undefined} onChange={(from) => update({ from })} placeholder="Any day" className={inputClass} ariaLabel="From" /></label>
                <label className="text-meta">To<DateInput value={filters.to} min={filters.from || undefined} onChange={(to) => update({ to })} placeholder="Any day" className={inputClass} ariaLabel="To" /></label>
              </div>
              <button type="button" onClick={() => update(emptyFilters)} className="mt-3 text-meta text-[#77786f] underline underline-offset-4 hover:text-[#292b26]">Clear filters</button>

              {error && <p role="alert" className="mt-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}
              <MissingDataNotice missing={missing} className="mt-5" />
              {!result && !error && <p className="mt-5 text-body text-[#85867c]">Loading the audit log...</p>}
              {result?.items.length === 0 && <p className="mt-5 text-body text-[#85867c]">No changes match these filters.</p>}

              {result && result.items.length > 0 && (
                <div className="mt-5 divide-y divide-[#ecebe5]">
                  {result.items.map((record) => (
                    <AuditRow key={record.id} record={record} isOpen={openId === record.id} onToggle={() => setOpenId((current) => (current === record.id ? null : record.id))} />
                  ))}
                </div>
              )}
              {result && <Pagination offset={offset} limit={pageSize} total={result.total} onChange={setOffset} noun="changes" />}
            </section>
          </div></div>
        </div>
      </div>
    </main>
  );
}

function AuditRow({ record, isOpen, onToggle }: { record: AuditRecord; isOpen: boolean; onToggle: () => void }) {
  const href = auditEntityHref(record);
  const hasChanges = record.changes !== null && record.changes !== undefined;
  const author = record.user_name ?? (record.user_id ? "Unknown user" : "Not signed in");
  return (
    <div className="py-3">
      <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)_170px_110px_auto] sm:items-start sm:gap-4">
        <span className="text-meta text-[#9b8353]">{formatJst(record.created_at, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
        <div className="min-w-0">
          <p className="text-lead"><span className="font-medium">{formatEntity(record.entity)}</span> · {formatStatus(record.action)}</p>
          <p className="mt-1 truncate text-meta text-[#85867c]">
            {record.entity_id ? (href ? <Link href={href} className="underline underline-offset-2 hover:text-[#292b26]">{record.entity_id}</Link> : record.entity_id) : href ? <Link href={href} className="underline underline-offset-2 hover:text-[#292b26]">Several</Link> : "Several"}
          </p>
        </div>
        <span className="text-meta text-[#66685f]">{author}{record.user_role && <span className="ml-1 text-[#aaa99f]">· {formatStatus(record.user_role)}</span>}{record.ip && <span className="mt-1 block text-label text-[#aaa99f]">{record.ip}</span>}</span>
        <span title={record.outcome === "PENDING" ? "Recorded before the change, never finished: the server stopped mid-request." : record.status ? `HTTP ${record.status}` : undefined} className={`w-fit px-2 py-1 text-label ${outcomeClass(record.outcome)}`}>{formatOutcome(record.outcome)}</span>
        {hasChanges ? <button type="button" onClick={onToggle} aria-expanded={isOpen} className="h-7 w-fit border border-[#deddd6] px-2 text-meta hover:bg-[#f8f7f3]">{isOpen ? "Hide data" : "Data sent"}</button> : <span className="text-meta text-[#aaa99f]">—</span>}
      </div>
      {isOpen && hasChanges && (
        <div className="mt-3 bg-[#f8f7f3] p-3">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-meta leading-relaxed text-[#55574f]">{JSON.stringify(record.changes, null, 2)}</pre>
          <p className="mt-2 text-label text-[#96968b]">{record.route}{record.request_id && ` · request ${record.request_id}`}</p>
        </div>
      )}
    </div>
  );
}
