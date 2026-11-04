"use client";

import { useMemo, useState } from "react";

import { filterOptions, findExactOption } from "@/lib/search";

type RelationOption = {
  id: string;
  name: string;
  code?: string;
};

type RelationSelectorProps<T extends RelationOption> = {
  label: string;
  options: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
  compact?: boolean;
  /** Creates an option named as typed (it is then selected); without it nothing can be created. */
  onCreate?: (name: string) => Promise<T>;
};

/** Several options, chosen from a list that can be searched (and, with `onCreate`, extended). */
export function RelationSelector<T extends RelationOption>({ label, options, selected, onChange, compact = false, onCreate }: RelationSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const selectedIds = new Set(selected.map((item) => item.id));
  const noun = label.toLowerCase().replace(/s$/, "");
  const visible = useMemo(() => {
    const byId = new Map(options.map((option) => [option.id, option]));
    const matches = filterOptions(options.map((option) => ({ id: option.id, label: option.name, detail: option.code })), query);
    return matches.map((match) => byId.get(match.id)!);
  }, [options, query]);
  const canCreate = Boolean(onCreate && query.trim() && !findExactOption(options.map((option) => ({ id: option.id, label: option.name })), query));

  async function create() {
    if (!onCreate || isCreating) return;
    setIsCreating(true); setError("");
    try {
      const option = await onCreate(query.trim());
      onChange([...selected, option]);
      setQuery("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Could not create the ${noun}.`);
    } finally {
      setIsCreating(false);
    }
  }
  const summary = selected.length ? selected.map((item) => item.name).join(" · ") : `Select ${label.toLowerCase()}`;

  function toggle(option: T) {
    onChange(selectedIds.has(option.id) ? selected.filter((item) => item.id !== option.id) : [...selected, option]);
  }

  return (
    <div className="relative">
      {!compact && <p className="mb-2 text-[9px] text-[#77786f]">{label}</p>}
      <button type="button" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen} className={`flex min-h-9 w-full items-center justify-between gap-3 border bg-[#f8f7f3] px-3 text-left text-[9px] transition-colors ${isOpen ? "border-[#b5a786]" : "border-[#e3e1da] hover:border-[#c9c0aa]"}`}>
        <span className={selected.length ? "text-[#55574f]" : "text-[#aaa99f]"}>{summary}</span>
        <span className={`text-[10px] text-[#9b8353] transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {isOpen && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto border border-[#deddd6] bg-[#fffefa] p-1 shadow-[0_8px_18px_rgba(42,43,38,0.08)]">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(event) => { setQuery(event.target.value); setError(""); }}
          // Enter creates (or does nothing) instead of submitting the form.
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (canCreate) void create(); } if (event.key === "Escape") setIsOpen(false); }}
          placeholder={onCreate ? `Search or create a ${noun}...` : `Search ${label.toLowerCase()}...`}
          aria-label={`Search ${label.toLowerCase()}`}
          className="mb-1 h-8 w-full border border-[#e3e1da] bg-white px-2.5 text-[9px] outline-none focus:border-[#b5a786]"
        />
        {canCreate && <button type="button" disabled={isCreating} onClick={() => void create()} className="block w-full px-2.5 py-2 text-left text-[9px] text-[#9b8353] hover:bg-[#f5f2ea] disabled:opacity-60">{isCreating ? `Creating ${noun}…` : `+ Create ${noun} “${query.trim()}”`}</button>}
        {error && <p role="alert" className="px-2.5 py-1 text-[9px] text-[#9b6f37]">{error}</p>}
        {visible.length ? visible.map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 px-2.5 py-2 text-[9px] transition-colors ${selectedIds.has(option.id) ? "bg-[#eee9dc] text-[#292b26]" : "text-[#77786f] hover:bg-[#f5f2ea]"}`}>
          <input type="checkbox" checked={selectedIds.has(option.id)} onChange={() => toggle(option)} className="sr-only" />
          <span className={`flex h-3.5 w-3.5 items-center justify-center border text-[9px] ${selectedIds.has(option.id) ? "border-[#9b8353] bg-[#9b8353] text-white" : "border-[#cfcabb] bg-white"}`}>{selectedIds.has(option.id) ? "✓" : ""}</span>
          <span className="min-w-0 flex-1 truncate">{option.name}</span>
          {option.code && <span className="text-[8px] uppercase tracking-[0.08em] text-[#aaa99f]">{option.code}</span>}
        </label>) : !canCreate && <p className="px-2.5 py-3 text-[9px] text-[#aaa99f]">{query.trim() ? `No ${label.toLowerCase()} match “${query.trim()}”` : `No ${label.toLowerCase()} available`}</p>}
      </div>}
      {selected.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{selected.map((item) => <span key={item.id} className="border border-[#d8d0b9] bg-[#eee9dc] px-2 py-1 text-[8px] text-[#686554]">{item.name}</span>)}</div>}
    </div>
  );
}
