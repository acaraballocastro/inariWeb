"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { filterOptions, findExactOption, type SearchOption } from "@/lib/search";

export type ComboboxOption = SearchOption;

type ComboboxProps = {
  /** The selected option's id, or "" for none. */
  value: string;
  options: ComboboxOption[];
  onChange: (id: string) => void;
  /** Creates an option named as typed and returns it; without it nothing can be created. */
  onCreate?: (name: string) => Promise<ComboboxOption>;
  /** "zone", "place"…: used in "Create zone “Kyoto”" and the empty messages. */
  noun: string;
  placeholder?: string;
  /** Lets the selection be cleared, showing this when nothing is selected. */
  emptyLabel?: string;
  disabled?: boolean;
  inputClass: string;
  ariaLabel?: string;
};

type Row = { kind: "option"; option: ComboboxOption } | { kind: "create"; name: string };

/**
 * A text input that filters a list as you type, like the customer search, and
 * offers to create what you typed when nothing is called that. Arrow keys move,
 * Enter picks, Escape gives up.
 */
export function Combobox({ value, options, onChange, onCreate, noun, placeholder, emptyLabel, disabled = false, inputClass, ariaLabel }: ComboboxProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Null while not typing: the input shows the selected option.
  const [query, setQuery] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  // Created here, so they show at once even before the parent's list catches up.
  const [created, setCreated] = useState<ComboboxOption[]>([]);

  const allOptions = useMemo(() => {
    const known = new Set(options.map((option) => option.id));
    return [...options, ...created.filter((option) => !known.has(option.id))];
  }, [options, created]);
  const selected = allOptions.find((option) => option.id === value);
  const plural = noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : `${noun}s`;
  const typed = query ?? "";

  const rows = useMemo<Row[]>(() => {
    const matches: Row[] = filterOptions(allOptions, typed).slice(0, 50).map((option) => ({ kind: "option", option }));
    const name = typed.trim();
    if (onCreate && name && !findExactOption(allOptions, name)) matches.push({ kind: "create", name });
    return matches;
  }, [allOptions, typed, onCreate]);

  function close() {
    setIsOpen(false);
    setQuery(null);
    setActive(0);
  }

  function pick(id: string) {
    onChange(id);
    setError("");
    close();
  }

  async function create(name: string) {
    if (!onCreate || isCreating) return;
    setIsCreating(true);
    setError("");
    try {
      const option = await onCreate(name);
      setCreated((current) => [...current, option]);
      pick(option.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Could not create the ${noun}.`);
    } finally {
      setIsCreating(false);
    }
  }

  function choose(row: Row | undefined) {
    if (!row) return;
    if (row.kind === "option") pick(row.option.id);
    else void create(row.name);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (rows.length ? (current + step + rows.length) % rows.length : 0));
    } else if (event.key === "Enter") {
      // Never submits the surrounding form while choosing.
      if (isOpen) {
        event.preventDefault();
        choose(rows[active]);
      }
    } else if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        close();
      }
    }
  }

  const activeRowId = isOpen && rows[active] ? `${listId}-${active}` : undefined;
  const showClear = Boolean(emptyLabel && value && !disabled);

  return (
    <div className="relative">
      <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeRowId}
        autoComplete="off"
        disabled={disabled || isCreating}
        value={query ?? selected?.label ?? ""}
        placeholder={placeholder ?? emptyLabel ?? `Search a ${noun}...`}
        onFocus={(event) => { setIsOpen(true); event.currentTarget.select(); }}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setActive(0); setError(""); }}
        onBlur={close}
        onKeyDown={handleKeyDown}
        className={`${inputClass} ${showClear ? "pr-8" : ""}`}
      />
      {showClear && (
        <button type="button" aria-label={`Clear the ${noun}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { pick(""); inputRef.current?.focus(); }} className="absolute bottom-0 right-0 flex h-9 w-8 items-center justify-center text-[11px] text-[#96968b] hover:text-[#292b26]">×</button>
      )}
      </div>
      {isOpen && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto border border-[#deddd6] bg-[#fffefa] py-1 shadow-[0_8px_18px_rgba(42,43,38,0.08)]">
          {rows.length === 0 && <li className="px-3 py-2 text-[9px] text-[#96968b]">{typed.trim() ? `No ${noun} matches “${typed.trim()}”.` : `No ${plural} yet.`}</li>}
          {rows.map((row, index) => (
            <li
              key={row.kind === "option" ? row.option.id : "create"}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={row.kind === "option" && row.option.id === value}
              // Keeps the focus in the input, so blur does not close the list first.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(row)}
              className={`cursor-pointer px-3 py-2 text-[10px] ${index === active ? "bg-[#f1ede2]" : ""} ${row.kind === "create" ? "border-t border-[#ecebe5] text-[#9b8353]" : "text-[#292b26]"}`}
            >
              {row.kind === "option" ? (
                <>
                  <span className="block truncate">{row.option.label}{row.option.id === value && <span className="ml-2 text-[8px] text-[#9b8353]">Selected</span>}</span>
                  {row.option.detail && <span className="mt-0.5 block truncate text-[8px] text-[#85867c]">{row.option.detail}</span>}
                </>
              ) : (
                <span className="block truncate">{isCreating ? `Creating ${noun}…` : `+ Create ${noun} “${row.name}”`}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-1 text-[9px] text-[#9b6f37]">{error}</p>}
    </div>
  );
}
