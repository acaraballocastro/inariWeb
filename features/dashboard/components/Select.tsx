"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export type SelectOption = { value: string; label: string; detail?: string | null };
export type SelectGroup = { label: string; options: SelectOption[] };

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  /** Plain options, or groups with a heading each. */
  options: SelectOption[] | SelectGroup[];
  disabled?: boolean;
  /** Classes of the closed control: the same input classes the forms use. */
  className: string;
  ariaLabel?: string;
  /** Shown when no option has the value. */
  placeholder?: string;
};

function isGrouped(options: SelectOption[] | SelectGroup[]): options is SelectGroup[] {
  return options.length > 0 && "options" in options[0];
}

/**
 * The app's own drop-down, in place of the browser's <select>: same look as the
 * search pickers (Combobox). Keyboard: Enter, Space or the arrows open it; the
 * arrows move; Enter picks; Escape closes; typing a letter jumps to the first
 * option starting with it.
 */
export function Select({ value, onChange, options, disabled = false, className, ariaLabel, placeholder = "Select…" }: SelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(0);

  const groups = useMemo<SelectGroup[]>(() => (isGrouped(options) ? options : [{ label: "", options }]), [options]);
  const flat = useMemo(() => groups.flatMap((group) => group.options), [groups]);
  // Index in `flat` of each group's first option.
  const offsets = useMemo(() => groups.map((_, groupIndex) => groups.slice(0, groupIndex).reduce((total, group) => total + group.options.length, 0)), [groups]);
  const selected = flat.find((option) => option.value === value);

  // Closes on a click anywhere else.
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  function open() {
    if (disabled) return;
    setActive(Math.max(0, flat.findIndex((option) => option.value === value)));
    setIsOpen(true);
  }

  function pick(option: SelectOption | undefined) {
    if (option && option.value !== value) onChange(option.value);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) { open(); return; }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (flat.length ? (current + step + flat.length) % flat.length : 0));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) pick(flat[active]);
      else open();
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    } else if (event.key === "Tab") {
      setIsOpen(false);
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      const letter = event.key.toLowerCase();
      const index = flat.findIndex((option) => option.label.toLowerCase().startsWith(letter));
      if (index >= 0) {
        if (isOpen) setActive(index);
        else pick(flat[index]);
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={isOpen && flat[active] ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={`${className} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${selected ? "" : "text-[#aaa99f]"}`}>{selected?.label ?? placeholder}</span>
        <span aria-hidden="true" className={`shrink-0 text-[10px] text-[#9b8353] transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {isOpen && (
        // Inside a <label>, a click here would otherwise be passed on to the
        // button and open the list again.
        <ul id={listId} role="listbox" onClick={(event) => event.preventDefault()} className="absolute z-30 mt-1 max-h-60 min-w-full overflow-y-auto border border-[#deddd6] bg-[#fffefa] py-1 shadow-[0_8px_18px_rgba(42,43,38,0.08)]">
          {groups.map((group, groupIndex) => (
            <li key={group.label || "options"} role="presentation">
              {group.label && <p className="px-3 pb-1 pt-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#aaa28f]">{group.label}</p>}
              <ul role="group" aria-label={group.label || undefined}>
                {group.options.map((option, position) => {
                  const optionIndex = offsets[groupIndex] + position;
                  return (
                    <li
                      key={option.value}
                      id={`${listId}-${optionIndex}`}
                      role="option"
                      aria-selected={option.value === value}
                      onMouseEnter={() => setActive(optionIndex)}
                      onClick={() => pick(option)}
                      className={`flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-[10px] text-[#292b26] ${optionIndex === active ? "bg-[#f1ede2]" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{option.label}</span>
                        {option.detail && <span className="mt-0.5 block truncate text-[8px] text-[#85867c]">{option.detail}</span>}
                      </span>
                      {option.value === value && <span aria-hidden="true" className="text-[9px] text-[#9b8353]">✓</span>}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {flat.length === 0 && <li className="px-3 py-2 text-[9px] text-[#96968b]">Nothing to choose.</li>}
        </ul>
      )}
    </div>
  );
}
