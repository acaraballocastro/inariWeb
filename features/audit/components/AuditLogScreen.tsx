"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { auditEntities, auditEntityHref, auditOutcomes, formatEntity, formatOutcome, listAuditLogPage, outcomeClass, securityActions, type AuditFilter, type AuditOutcome, type AuditRecord } from "@/features/audit/api";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { Pagination } from "@/features/dashboard/components/Pagination";
import { listUsers, type User } from "@/features/users/api";
import { formatJst, startOfJstDay } from "@/lib/datetime";
import { formatStatus } from "@/lib/status";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

const pageSize = 50;
const dayMs = 24 * 60 * 60 * 1000;

type Filters = { entity: string; entityId: string; userId: string; action: string; outcome: AuditOutcome | ""; from: string; to: string };
const emptyFilters: Filters = { entity: "", entityId: "", userId: "", action: "", outcome: "", from: "", to: "" };

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]";

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
              <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">WORKSPACE / AUDIT</p>
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Audit log</h1>
              <p className="mt-2 max-w-[620px] text-[11px] text-[#85867c]">Every change made in the workspace and every sign-in: who, when, from where and what they sent. A change is recorded before it runs, so none happens without its entry. Passwords and tokens are never kept, and the data sent about a user is erased when that user is deleted permanently.</p>
            </header>

            <section className="mt-5 bg-white p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-[9px]">What<select value={filters.entity} onChange={(event) => update({ entity: event.target.value })} className={inputClass}><option value="">Everything</option>{auditEntities.map((entity) => <option key={entity} value={entity}>{formatEntity(entity)}</option>)}</select></label>
                <label className="text-[9px]">ID or code<input value={filters.entityId} onChange={(event) => update({ entityId: event.target.value })} placeholder="R00042, a UUID..." className={`${inputClass} placeholder:text-[#aaa99f]`} /></label>
                <label className="text-[9px]">Who<select value={filters.userId} onChange={(event) => update({ userId: event.target.value })} className={inputClass}><option value="">Anyone</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                <label className="text-[9px]">Action<select value={filters.action} onChange={(event) => update({ action: event.target.value })} className={inputClass}><option value="">Any action</option><optgroup label="Sign-ins & security">{securityActions.map((action) => <option key={action} value={action}>{formatStatus(action)}</option>)}</optgroup><optgroup label="Changes">{["CREATED", "UPDATED", "DELETED", "CANCELLED", "DELETED_PERMANENTLY", "STATUS_CHANGED", "PAYMENT_CONFIRMED", "GUIDE_ASSIGNED", "GUIDE_UNASSIGNED"].map((action) => <option key={action} value={action}>{formatStatus(action)}</option>)}</optgroup></select></label>
                <label className="text-[9px]">Outcome<select value={filters.outcome} onChange={(event) => update({ outcome: event.target.value as AuditOutcome | "" })} className={inputClass}><option value="">Any outcome</option>{auditOutcomes.map((outcome) => <option key={outcome} value={outcome}>{formatOutcome(outcome)}</option>)}</select></label>
                <label className="text-[9px]">From<input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => update({ from: event.target.value })} className={inputClass} /></label>
                <label className="text-[9px]">To<input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => update({ to: event.target.value })} className={inputClass} /></label>
              </div>
              <button type="button" onClick={() => update(emptyFilters)} className="mt-3 text-[9px] text-[#77786f] underline underline-offset-4 hover:text-[#292b26]">Clear filters</button>

              {error && <p role="alert" className="mt-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-[10px] text-[#9b6f37]">{error}</p>}
              <MissingDataNotice missing={missing} className="mt-5" />
              {!result && !error && <p className="mt-5 text-[10px] text-[#85867c]">Loading the audit log...</p>}
              {result?.items.length === 0 && <p className="mt-5 text-[10px] text-[#85867c]">No changes match these filters.</p>}

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
        <span className="text-[9px] text-[#9b8353]">{formatJst(record.created_at, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
        <div className="min-w-0">
          <p className="text-[11px]"><span className="font-medium">{formatEntity(record.entity)}</span> · {formatStatus(record.action)}</p>
          <p className="mt-1 truncate text-[9px] text-[#85867c]">
            {record.entity_id ? (href ? <Link href={href} className="underline underline-offset-2 hover:text-[#292b26]">{record.entity_id}</Link> : record.entity_id) : href ? <Link href={href} className="underline underline-offset-2 hover:text-[#292b26]">Several</Link> : "Several"}
          </p>
        </div>
        <span className="text-[9px] text-[#66685f]">{author}{record.user_role && <span className="ml-1 text-[#aaa99f]">· {formatStatus(record.user_role)}</span>}{record.ip && <span className="mt-1 block text-[8px] text-[#aaa99f]">{record.ip}</span>}</span>
        <span title={record.outcome === "PENDING" ? "Recorded before the change, never finished: the server stopped mid-request." : record.status ? `HTTP ${record.status}` : undefined} className={`w-fit px-2 py-1 text-[8px] ${outcomeClass(record.outcome)}`}>{formatOutcome(record.outcome)}</span>
        {hasChanges ? <button type="button" onClick={onToggle} aria-expanded={isOpen} className="h-7 w-fit border border-[#deddd6] px-2 text-[9px] hover:bg-[#f8f7f3]">{isOpen ? "Hide data" : "Data sent"}</button> : <span className="text-[9px] text-[#aaa99f]">—</span>}
      </div>
      {isOpen && hasChanges && (
        <div className="mt-3 bg-[#f8f7f3] p-3">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-relaxed text-[#55574f]">{JSON.stringify(record.changes, null, 2)}</pre>
          <p className="mt-2 text-[8px] text-[#96968b]">{record.route}{record.request_id && ` · request ${record.request_id}`}</p>
        </div>
      )}
    </div>
  );
}
