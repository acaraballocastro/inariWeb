"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { Pagination } from "@/features/dashboard/components/Pagination";
import type { Page } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

const inputClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-[10px] outline-none focus:border-[#b5a786]";

export type RecordField = { key: string; label: string; type?: "text" | "email" | "number" | "textarea"; required?: boolean; placeholder?: string };
export type RecordDraft = Record<string, string | boolean>;
export type RecordColumn<T> = { label: string; render: (item: T) => ReactNode; width: string };

export type RecordsConfig<T extends { id: string }> = {
  title: string;
  eyebrow: string;
  description: string;
  activeItem: string;
  /** Singular, lowercase: "agency". */
  noun: string;
  columns: RecordColumn<T>[];
  fields: RecordField[];
  /** Adds an Active checkbox to the edit form and an active filter. */
  isActive?: (item: T) => boolean;
  searchText: (item: T) => string;
  toDraft: (item: T | null) => RecordDraft;
  /** Small catalogues: loaded whole and searched in the browser. */
  list?: () => Promise<T[]>;
  /** Large lists: paged and searched on the server instead of `list`. */
  remote?: { listPage: (page: { limit: number; offset: number }) => Promise<Page<T>>; search: (query: string) => Promise<T[]>; searchLimit: number };
  create: (draft: RecordDraft) => Promise<unknown>;
  update: (item: T, draft: RecordDraft) => Promise<unknown>;
  remove: (item: T) => Promise<unknown>;
  label: (item: T) => string;
};

const pageSize = 50;

/** List, search, create, edit and delete for a simple admin catalogue. */
export function RecordsScreen<T extends { id: string }>({ config }: { config: RecordsConfig<T> }) {
  const [items, setItems] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [draft, setDraft] = useState<RecordDraft>({});
  const [isSaving, setIsSaving] = useState(false);

  const { list, remote } = config;
  const remoteQuery = useDebouncedValue(remote ? query.trim() : "");

  const fetchItems = useCallback((): Promise<Page<T>> => {
    if (!remote) return (list?.() ?? Promise.resolve([])).then((result) => ({ items: result, total: result.length }));
    if (remoteQuery) return remote.search(remoteQuery).then((result) => ({ items: result, total: result.length }));
    return remote.listPage({ limit: pageSize, offset });
  }, [list, remote, remoteQuery, offset]);

  const reload = useCallback(() => fetchItems().then((page) => { setItems(page.items); setTotal(page.total); }), [fetchItems]);

  useEffect(() => {
    let active = true;
    fetchItems()
      .then((page) => { if (active) { setItems(page.items); setTotal(page.total); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the list."); });
    return () => { active = false; };
  }, [fetchItems]);

  // Remote lists come already searched by the server.
  const filtered = useMemo(() => {
    const normalized = remote ? "" : query.trim().toLowerCase();
    return (items ?? []).filter((item) => (showInactive || !config.isActive || config.isActive(item)) && config.searchText(item).toLowerCase().includes(normalized));
  }, [items, query, showInactive, config, remote]);

  function openForm(item: T | null) {
    setError("");
    setDraft(config.toDraft(item));
    setEditing(item ?? "new");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = config.fields.find((field) => field.required && !String(draft[field.key] ?? "").trim());
    if (missing) { setError(`${missing.label} is required.`); return; }
    setIsSaving(true); setError("");
    try {
      if (editing === "new") await config.create(draft);
      else if (editing) await config.update(editing, draft);
      await reload();
      setEditing(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Could not save the ${config.noun}.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: T) {
    if (!window.confirm(`Delete ${config.label(item)}?`)) return;
    setError("");
    try {
      await config.remove(item);
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Could not delete the ${config.noun}.`);
    }
  }

  const grid = { gridTemplateColumns: `${config.columns.map((column) => column.width).join(" ")} 110px` };

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem={config.activeItem} />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb={`Workspace / ${config.title}`} />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1190px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10"><p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">{config.eyebrow}</p><h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">{config.title}</h1><p className="mt-2 max-w-[560px] text-[11px] text-[#85867c]">{config.description}</p></header>

            <section className="mt-5 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-[#ecebe5] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div><h2 className="font-serif text-xl">{config.title}</h2><p className="mt-2 text-[9px] text-[#96968b]">{items && !(remote && remoteQuery) ? `${total} in total` : "Live data from InariOps"}</p></div>
                {editing === null && <button type="button" onClick={() => openForm(null)} className="h-9 bg-[#292b26] px-4 text-[9px] font-medium text-white hover:bg-[#3a3d34]">+ Add {config.noun}</button>}
              </div>

              {editing !== null && (
                <form onSubmit={handleSubmit} className="mt-5 grid gap-3 border-b border-[#ecebe5] pb-5 sm:grid-cols-2 lg:grid-cols-3">
                  <p className="text-[10px] font-medium sm:col-span-2 lg:col-span-3">{editing === "new" ? `New ${config.noun}` : `Edit ${config.label(editing)}`}</p>
                  {config.fields.map((field) => (
                    <label key={field.key} className={`text-[9px] text-[#77786f] ${field.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                      {field.label}{field.required ? " *" : ""}
                      {field.type === "textarea"
                        ? <textarea value={String(draft[field.key] ?? "")} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} placeholder={field.placeholder} className={`${inputClass} h-auto min-h-16 py-2`} />
                        : <input type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} value={String(draft[field.key] ?? "")} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} placeholder={field.placeholder} className={inputClass} />}
                    </label>
                  ))}
                  {config.isActive && editing !== "new" && <label className="flex items-center gap-2 self-end pb-2 text-[9px]"><input type="checkbox" checked={draft.is_active === true} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />Active</label>}
                  <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-4 text-[9px] font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : editing === "new" ? "Create" : "Save changes"}</button><button type="button" onClick={() => setEditing(null)} className="h-9 border border-[#deddd6] px-4 text-[9px]">Cancel</button></div>
                </form>
              )}

              <div className="mt-5 flex flex-wrap items-end gap-3"><label className="min-w-[200px] flex-1 text-[9px]">Search<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0); }} placeholder="Search..." className={inputClass} /></label>{config.isActive && <label className="flex h-9 items-center gap-2 text-[9px]"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />Show inactive</label>}</div>

              {error && <p role="alert" className="mt-4 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-[10px] text-[#9b6f37]">{error}</p>}
              {!items && !error && <p className="mt-6 text-[10px] text-[#85867c]">Loading...</p>}
              {items && filtered.length === 0 && <p className="mt-6 text-[10px] text-[#85867c]">No results found.</p>}
              {filtered.length > 0 && (
                <div className="mt-6 overflow-x-auto"><div className="min-w-[700px]">
                  <div style={grid} className="grid gap-3 border-b border-[#ecebe5] pb-3 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#a19a87]">{config.columns.map((column) => <span key={column.label}>{column.label}</span>)}<span>Actions</span></div>
                  <div className="divide-y divide-[#f0efe9]">
                    {filtered.map((item) => (
                      <div key={item.id} style={grid} className="grid items-center gap-3 py-3 text-[9px] hover:bg-[#fbfaf7]">
                        {config.columns.map((column) => <span key={column.label} className="min-w-0 break-words">{column.render(item)}</span>)}
                        <span className="flex gap-2 text-[8px]"><button type="button" onClick={() => openForm(item)} className="underline underline-offset-2">Edit</button><button type="button" onClick={() => handleDelete(item)} className="text-[#9b6f37] underline underline-offset-2">Delete</button></span>
                      </div>
                    ))}
                  </div>
                </div></div>
              )}
              {items && remote && !remoteQuery && <Pagination offset={offset} limit={pageSize} total={total} onChange={setOffset} noun={config.title.toLowerCase()} />}
              {items && !(remote && !remoteQuery) && <p className="mt-5 text-[9px] text-[#96968b]">{filtered.length} shown{remote && filtered.length >= remote.searchLimit ? ` · only the first ${remote.searchLimit} matches, refine the search` : ""}</p>}
            </section>
          </div></div>
        </div>
      </div>
    </main>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <span className={`inline-block px-2 py-1 text-[8px] ${active ? "bg-[#eef0e9] text-[#68705d]" : "bg-[#f2e8d8] text-[#9b6f37]"}`}>{active ? "Active" : "Inactive"}</span>;
}
