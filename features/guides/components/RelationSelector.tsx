"use client";

import { useState } from "react";

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
};

export function RelationSelector<T extends RelationOption>({ label, options, selected, onChange, compact = false }: RelationSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedIds = new Set(selected.map((item) => item.id));
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
      {isOpen && <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto border border-[#deddd6] bg-[#fffefa] p-1 shadow-[0_8px_18px_rgba(42,43,38,0.08)]">
        {options.length ? options.map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 px-2.5 py-2 text-[9px] transition-colors ${selectedIds.has(option.id) ? "bg-[#eee9dc] text-[#292b26]" : "text-[#77786f] hover:bg-[#f5f2ea]"}`}>
          <input type="checkbox" checked={selectedIds.has(option.id)} onChange={() => toggle(option)} className="sr-only" />
          <span className={`flex h-3.5 w-3.5 items-center justify-center border text-[9px] ${selectedIds.has(option.id) ? "border-[#9b8353] bg-[#9b8353] text-white" : "border-[#cfcabb] bg-white"}`}>{selectedIds.has(option.id) ? "✓" : ""}</span>
          <span className="min-w-0 flex-1 truncate">{option.name}</span>
          {option.code && <span className="text-[8px] uppercase tracking-[0.08em] text-[#aaa99f]">{option.code}</span>}
        </label>) : <p className="px-2.5 py-3 text-[9px] text-[#aaa99f]">No {label.toLowerCase()} available</p>}
      </div>}
      {selected.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{selected.map((item) => <span key={item.id} className="border border-[#d8d0b9] bg-[#eee9dc] px-2 py-1 text-[8px] text-[#686554]">{item.name}</span>)}</div>}
    </div>
  );
}
