"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { createLanguage, createZone, deleteLanguage, deleteZone, listLanguages, listZones, updateLanguage, updateZone, type Language, type Zone } from "@/features/catalogs/api";

type CatalogKind = "languages" | "zones";
type CatalogItem = Language | Zone;
const inputClass = "h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-meta outline-none focus:border-[#b5a786]";

export function CatalogScreen({ kind }: { kind: CatalogKind }) {
  const { confirm } = useDialogs();
  const isLanguage = kind === "languages";
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    (isLanguage ? listLanguages() : listZones())
      .then(setItems)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load the catalog."))
      .finally(() => setIsLoading(false));
  }, [isLanguage]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => `${item.name} ${isLanguage ? (item as Language).code : (item as Zone).type}`.toLowerCase().includes(normalizedQuery));
  }, [items, isLanguage, query]);

  async function handleSave(item: CatalogItem) {
    setActionError("");
    try {
      if (isLanguage) {
        await updateLanguage((item as Language).code, { name: item.name, is_active: item.is_active });
      } else {
        await updateZone(item.id, { name: item.name, type: (item as Zone).type, is_active: item.is_active });
      }
      setItems((currentItems) => currentItems.map((currentItem) => currentItem.id === item.id ? item : currentItem));
      setEditingId(null);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Could not update the record.");
    }
  }

  async function handleDelete(item: CatalogItem) {
    if (!await confirm({ title: `Delete ${item.name}?`, message: "Records in use cannot be deleted; deactivate them instead.", confirmLabel: "Delete", tone: "danger" })) return;
    setActionError("");
    try {
      if (isLanguage) await deleteLanguage((item as Language).code);
      else await deleteZone(item.id);
      setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Could not delete the record.");
    }
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem={isLanguage ? "Languages" : "Zones"} />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb={`Workspace / ${isLanguage ? "Languages" : "Zones"}`} />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1190px]">
            <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10"><p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">CONTENT / CATALOG</p><h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">{isLanguage ? "Languages" : "Zones"}</h1><p className="mt-2 max-w-[540px] text-lead text-[#85867c]">{isLanguage ? "Manage the languages available across your guide network." : "Manage the areas available for guide assignments and itineraries."}</p></header>
            <CatalogStats items={items} kind={kind} />
            <section className="mt-5 bg-white p-5 sm:p-6"><div className="flex flex-col gap-4 border-b border-[#ecebe5] pb-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-serif text-xl">{isLanguage ? "Language catalog" : "Zone catalog"}</h2><p className="mt-2 text-meta text-[#96968b]">Live data from InariOps</p></div><button type="button" onClick={() => setShowCreate((current) => !current)} className="h-9 bg-[#292b26] px-4 text-meta font-medium text-white hover:bg-[#3a3d34]">+ Add {isLanguage ? "language" : "zone"}</button></div>
              {showCreate && <CreateForm kind={kind} onCreated={(item) => { setItems((currentItems) => [...currentItems, item]); setShowCreate(false); }} onError={setActionError} />}
              <div className="mt-5 flex gap-3"><label className="flex-1 text-meta"><span className="mb-2 block">Search {isLanguage ? "languages" : "zones"}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isLanguage ? "Name or code..." : "Name or type..."} className={inputClass} /></label><button type="button" onClick={() => setQuery("")} className="mt-[19px] h-9 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3]">Reset</button></div>
              {actionError && <p role="alert" className="mt-4 text-body text-[#9b6f37]">{actionError}</p>}{isLoading && <p className="mt-6 text-body text-[#85867c]">Loading...</p>}{error && <p role="alert" className="mt-6 text-body text-[#9b6f37]">{error}</p>}{!isLoading && !error && filteredItems.length === 0 && <p className="mt-6 text-body text-[#85867c]">No results found.</p>}{!isLoading && !error && filteredItems.length > 0 && <CatalogTable items={filteredItems} kind={kind} editingId={editingId} onEdit={setEditingId} onSave={handleSave} onDelete={handleDelete} />}
              <p className="mt-5 text-meta text-[#96968b]">{filteredItems.length} {isLanguage ? "languages" : "zones"} shown · Live catalog data</p>
            </section><footer className="pt-8 text-meta tracking-[0.03em] text-[#a09f94]">INARI TOURS · Connected to InariOps</footer>
          </div></div>
        </div>
      </div>
    </main>
  );
}

function CatalogStats({ items, kind }: { items: CatalogItem[]; kind: CatalogKind }) {
  const active = items.filter((item) => item.is_active).length;
  const metadataCount = new Set(items.map((item) => "type" in item ? item.type : item.code)).size;
  return <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[[`Total ${kind}`, items.length, "Live catalog"], ["Active", active, "Available for use"], ["Inactive", items.length - active, "Hidden from selectors"], [kind === "languages" ? "Codes" : "Types", metadataCount, "Catalog metadata"]].map(([label, value, note]) => <article key={String(label)} className="min-h-[100px] bg-white p-4"><p className="text-meta text-[#8b8c82]">{label}</p><p className="mt-3 font-serif text-2xl leading-none">{String(value).padStart(2, "0")}</p><p className="mt-2 text-label text-[#aaa99f]">{note}</p></article>)}</div>;
}

function CreateForm({ kind, onCreated, onError }: { kind: CatalogKind; onCreated: (item: CatalogItem) => void; onError: (message: string) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!name.trim() || (kind === "languages" && !code.trim())) { onError("Fill in the required fields."); return; } setIsSaving(true); onError(""); try { onCreated(kind === "languages" ? await createLanguage({ name: name.trim(), code: code.trim().toLowerCase() }) : await createZone({ name: name.trim() })); } catch (requestError) { onError(requestError instanceof Error ? requestError.message : "Could not create the record."); } finally { setIsSaving(false); } }
  return <form onSubmit={submit} className="mt-5 grid gap-3 border-b border-[#ecebe5] pb-5 sm:grid-cols-2 lg:grid-cols-4"><label className="text-meta text-[#77786f]">Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === "languages" ? "Japanese" : "Kyoto"} className={`${inputClass} mt-2`} /></label>{kind === "languages" && <label className="text-meta text-[#77786f]">Code<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="ja" maxLength={8} className={`${inputClass} mt-2`} /></label>}<span /><button type="submit" disabled={isSaving} className="h-9 self-end bg-[#292b26] px-4 text-meta font-medium text-white disabled:opacity-60">{isSaving ? "Creating..." : "Create"}</button></form>;
}

function CatalogTable({ items, kind, editingId, onEdit, onSave, onDelete }: { items: CatalogItem[]; kind: CatalogKind; editingId: string | null; onEdit: (id: string | null) => void; onSave: (item: CatalogItem) => void; onDelete: (item: CatalogItem) => void }) {
  return <div className="mt-6 md:overflow-x-auto"><div className="md:min-w-[650px]"><div className="hidden md:grid grid-cols-[minmax(220px,1.4fr)_minmax(130px,0.9fr)_110px_125px] gap-3 border-b border-[#ecebe5] pb-3 text-label font-semibold tracking-[0.16em] text-[#a19a87]"><span>NAME</span><span>{kind === "languages" ? "CODE" : "TYPE"}</span><span>STATUS</span><span>ACTIONS</span></div><div className="divide-y divide-[#f0efe9]">{items.map((item) => editingId === item.id ? <EditableCatalogRow key={item.id} item={item} kind={kind} onCancel={() => onEdit(null)} onSave={onSave} /> : <div key={item.id} className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1.4fr)_minmax(130px,0.9fr)_110px_125px] md:items-center md:gap-3 py-4 text-meta hover:bg-[#fbfaf7]"><span className="text-body">{item.name}</span><span className="text-label text-[#85867c]">{"code" in item ? item.code : item.type || "Unclassified"}</span><span className={`w-fit px-2 py-1 text-center text-label md:w-auto ${item.is_active ? "bg-[#eef0e9] text-[#68705d]" : "bg-[#f2e8d8] text-[#9b6f37]"}`}>{item.is_active ? "Active" : "Inactive"}</span><span className="flex gap-2 text-label"><button type="button" onClick={() => onEdit(item.id)} className="underline underline-offset-2">Edit</button><button type="button" onClick={() => onDelete(item)} className="text-[#9b6f37] underline underline-offset-2">Delete</button></span></div>)}</div></div></div>;
}

function EditableCatalogRow({ item, kind, onCancel, onSave }: { item: CatalogItem; kind: CatalogKind; onCancel: () => void; onSave: (item: CatalogItem) => void }) {
  const [name, setName] = useState(item.name);
  const [type, setType] = useState("type" in item ? item.type : "");
  const [isActive, setIsActive] = useState(item.is_active);
  const updated = "code" in item ? { ...item, name, is_active: isActive } : { ...item, name, type, is_active: isActive };
  return <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1.4fr)_minmax(130px,0.9fr)_110px_125px] md:items-center md:gap-3 bg-white py-3 text-meta"><input aria-label="Edit name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />{kind === "languages" ? <span className="text-meta text-[#85867c]">{"code" in item ? item.code : ""}</span> : <input aria-label="Edit type" value={type} onChange={(event) => setType(event.target.value)} className={inputClass} />}<label className="flex h-9 cursor-pointer items-center gap-2 border border-[#e3e1da] bg-[#f8f7f3] px-2.5 text-meta text-[#77786f]"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="sr-only" /><span className={`flex h-3.5 w-3.5 items-center justify-center border text-meta ${isActive ? "border-[#9b8353] bg-[#9b8353] text-white" : "border-[#cfcabb] bg-white text-transparent"}`}>✓</span><span>{isActive ? "Active" : "Inactive"}</span></label><span className="flex gap-1.5"><button type="button" onClick={() => onSave(updated)} className="h-9 bg-[#292b26] px-2.5 text-label font-medium text-white">Save</button><button type="button" onClick={onCancel} className="h-9 border border-[#deddd6] bg-white px-2.5 text-label text-[#77786f]">Cancel</button></span></div>;
}
